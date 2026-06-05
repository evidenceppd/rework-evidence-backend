'use strict';

const { AppError } = require('../utils/errors');
const env = require('../config/env');

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

function parseOriginFromReferer(referer) {
  try {
    return new URL(referer).origin;
  } catch {
    return null;
  }
}

function requireTrustedOrigin(req, _res, next) {
  if (SAFE_METHODS.has(req.method)) {
    return next();
  }

  const originHeader = typeof req.headers.origin === 'string' ? req.headers.origin : null;
  const refererHeader = typeof req.headers.referer === 'string' ? req.headers.referer : null;

  // Non-browser clients (no Origin/Referer) are allowed and still must pass auth checks.
  if (!originHeader && !refererHeader) {
    return next();
  }

  const requestOrigin = originHeader ?? parseOriginFromReferer(refererHeader);

  if (!requestOrigin || !env.cors.allowedOrigins.includes(requestOrigin)) {
    return next(new AppError('Request origin is not allowed', 403));
  }

  return next();
}

module.exports = { requireTrustedOrigin };
