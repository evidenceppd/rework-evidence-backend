'use strict';

const jwt = require('jsonwebtoken');
const { prisma } = require('../../src/lib/prisma');

const TEST_SECRET = 'test-secret'; // matches setup-env.js JWT_SECRET
const TRUSTED_ORIGIN = 'http://trusted.local';

/**
 * Sign a test access token that passes requireAuth.
 * @param {'MASTER'|'ADMIN'|'EDITOR'} role
 * @param {string} [jti]
 */
function makeAccessToken(role = 'MASTER', jti = `jti-${role}-${Date.now()}`) {
  return jwt.sign({ sub: 'admin-1', scope: 'access', jti, role }, TEST_SECRET, { expiresIn: '1h' });
}

/**
 * Headers for authenticated write requests (CSRF + auth).
 */
function authHeaders(role = 'MASTER') {
  return {
    'Content-Type': 'application/json',
    Origin: TRUSTED_ORIGIN,
    Authorization: `Bearer ${makeAccessToken(role)}`,
  };
}

/**
 * Headers for unauthenticated write requests (CSRF bypass, no auth).
 */
function writeHeaders() {
  return {
    'Content-Type': 'application/json',
    Origin: TRUSTED_ORIGIN,
  };
}

/**
 * Bypass the revokedToken DB check used inside requireAuth.
 * Call in beforeEach of any test that uses authenticated routes.
 */
function bypassTokenRevocation() {
  vi.spyOn(prisma.revokedToken, 'findUnique').mockResolvedValue(null);
}

module.exports = { makeAccessToken, authHeaders, writeHeaders, bypassTokenRevocation, TRUSTED_ORIGIN };
