'use strict';

const crypto = require('node:crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const repo = require('./auth.repository');
const { sendMfaCode } = require('../../config/mailer');
const env = require('../../config/env');
const { AppError } = require('../../utils/errors');

const GENERIC_LOGIN_ERROR = 'Invalid credentials';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function generateCode() {
  // Cryptographically random 6-digit code, zero-padded
  return String(crypto.randomInt(0, 1_000_000)).padStart(6, '0');
}

function hashCode(code) {
  return crypto.createHash('sha256').update(code).digest('hex');
}

function signMfaToken(userId) {
  return jwt.sign({ sub: userId, scope: 'mfa' }, env.jwt.secret, {
    expiresIn: env.jwt.mfaExpiry,
  });
}

function signAccessToken(userId, role) {
  const jti = crypto.randomUUID();
  const token = jwt.sign({ sub: userId, scope: 'access', jti, role }, env.jwt.secret, {
    expiresIn: env.jwt.accessExpiry,
  });
  return { token, jti };
}

// ─── Login ───────────────────────────────────────────────────────────────────

async function login(email, password) {
  if (!email || !password) {
    throw new AppError('Email and password are required');
  }

  const user = await repo.findUserByEmail(email);

  // Always run bcrypt to prevent timing attacks even when user is not found
  const hashToCheck = user?.passwordHash ?? '$2a$12$invalidhashplaceholderXXXXXXXXXXXXXXXXXXXXXXX';
  const valid = await bcrypt.compare(password, hashToCheck);

  if (!user || !valid || !user.active) {
    throw new AppError(GENERIC_LOGIN_ERROR, 401);
  }

  const code = generateCode();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
  await repo.createMfaCode(user.id, hashCode(code), expiresAt);

  await sendMfaCode(user.email, code);

  const mfaToken = signMfaToken(user.id);
  return { mfaToken };
}

// ─── MFA verify ──────────────────────────────────────────────────────────────

async function verifyMfa(mfaToken, code) {
  if (!mfaToken || !code) {
    throw new AppError('mfaToken and code are required');
  }

  let payload;
  try {
    payload = jwt.verify(mfaToken, env.jwt.secret);
  } catch {
    throw new AppError('Invalid or expired MFA token', 401);
  }

  if (payload.scope !== 'mfa') {
    throw new AppError('Invalid token scope', 401);
  }

  const activeCode = await repo.findActiveMfaCode(payload.sub);
  if (!activeCode) {
    throw new AppError('MFA code expired or not found', 401);
  }

  const codeMatches = hashCode(code) === activeCode.codeHash;
  // Mark used regardless to prevent brute-force of the same active code
  await repo.markMfaCodeUsed(activeCode.id);

  if (!codeMatches) {
    throw new AppError('Invalid MFA code', 401);
  }

  const user = await repo.findUserById(payload.sub);
  if (!user || !user.active) throw new AppError('Account is inactive', 403);

  const { token: accessToken } = signAccessToken(payload.sub, user.role);
  return { accessToken };
}

// ─── Logout ──────────────────────────────────────────────────────────────────

async function logout(accessToken) {
  if (!accessToken) throw new AppError('Token required', 400);

  let payload;
  try {
    payload = jwt.verify(accessToken, env.jwt.secret);
  } catch {
    throw new AppError('Invalid or expired token', 401);
  }

  if (payload.scope !== 'access') throw new AppError('Invalid token scope', 401);

  const expiresAt = new Date(payload.exp * 1000);
  await repo.revokeToken(payload.jti, expiresAt);
}

module.exports = { login, verifyMfa, logout };

