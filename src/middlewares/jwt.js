'use strict';

const jwt = require('jsonwebtoken');
const env = require('../config/env');
const { AppError } = require('../utils/errors');
const { isTokenRevoked } = require('../modules/auth/auth.repository');

/**
 * Express middleware that enforces a valid access-scoped JWT.
 * Attach to any router or use globally for protected methods.
 *
 * Expects: Authorization: Bearer <token>
 */
async function requireAuth(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(new AppError('Authorization header missing or malformed', 401));
  }

  const token = authHeader.slice(7);
  let payload;
  try {
    payload = jwt.verify(token, env.jwt.secret);
  } catch {
    return next(new AppError('Invalid or expired access token', 401));
  }

  if (payload.scope !== 'access') {
    return next(new AppError('Invalid token scope', 401));
  }

  if (await isTokenRevoked(payload.jti)) {
    return next(new AppError('Token has been revoked', 401));
  }

  req.adminId = payload.sub;
  req.adminRole = payload.role;
  next();
}

async function optionalAuth(req, _res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next();
  }

  const token = authHeader.slice(7);
  try {
    const payload = jwt.verify(token, env.jwt.secret);
    if (payload.scope !== 'access') return next();
    if (await isTokenRevoked(payload.jti)) return next();

    req.adminId = payload.sub;
    req.adminRole = payload.role;
  } catch {
    // Public routes must remain public; invalid optional credentials are ignored.
  }

  next();
}

module.exports = { requireAuth, optionalAuth };
