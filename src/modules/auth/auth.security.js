'use strict';

const crypto = require('node:crypto');
const { createFailureRateLimiter } = require('../../middlewares/rate-limit');

function getClientIp(req) {
  return req.ip || req.socket?.remoteAddress || 'unknown-ip';
}

function normalizeEmail(value) {
  if (typeof value !== 'string') {
    return null;
  }
  const normalized = value.trim().toLowerCase();
  return normalized.length > 0 ? normalized : null;
}

function getBearerToken(req) {
  const authHeader = req.headers?.authorization;
  if (typeof authHeader !== 'string' || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.slice(7);
}

function fingerprint(value) {
  return crypto.createHash('sha256').update(value).digest('hex').slice(0, 24);
}

const loginByIpLimiter = createFailureRateLimiter({
  name: 'auth-login-by-ip',
  keyGenerator: (req) => `login:ip:${getClientIp(req)}`,
  maxFailures: 5,
  windowMs: 15 * 60 * 1000,
  blockDurationsMs: [60 * 1000, 5 * 60 * 1000, 15 * 60 * 1000],
});

const loginByAccountLimiter = createFailureRateLimiter({
  name: 'auth-login-by-account',
  keyGenerator: (req) => {
    const email = normalizeEmail(req.body?.email);
    return email ? `login:account:${email}` : null;
  },
  maxFailures: 5,
  windowMs: 15 * 60 * 1000,
  blockDurationsMs: [60 * 1000, 5 * 60 * 1000, 15 * 60 * 1000],
});

const mfaByIpLimiter = createFailureRateLimiter({
  name: 'auth-mfa-by-ip',
  keyGenerator: (req) => `mfa:ip:${getClientIp(req)}`,
  maxFailures: 5,
  windowMs: 10 * 60 * 1000,
  blockDurationsMs: [2 * 60 * 1000, 10 * 60 * 1000, 30 * 60 * 1000],
});

const mfaByTokenLimiter = createFailureRateLimiter({
  name: 'auth-mfa-by-token',
  keyGenerator: (req) => {
    const token = getBearerToken(req);
    return token ? `mfa:token:${fingerprint(token)}` : null;
  },
  maxFailures: 5,
  windowMs: 10 * 60 * 1000,
  blockDurationsMs: [2 * 60 * 1000, 10 * 60 * 1000, 30 * 60 * 1000],
});

const loginRateLimit = [loginByIpLimiter, loginByAccountLimiter];
const mfaRateLimit = [mfaByIpLimiter, mfaByTokenLimiter];

module.exports = {
  loginRateLimit,
  mfaRateLimit,
};
