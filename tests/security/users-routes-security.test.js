'use strict';

/**
 * Route-level security tests for the users module.
 *
 * Verifies that POST and PUT routes have explicit requireAuth at the route
 * level, independent of any global app.js middleware.
 *
 * The users router is mounted in isolation (no global requireAuth from app.js).
 * For tests that need a valid JWT, prisma.revokedToken.findUnique is spied on
 * to return null (not revoked) without requiring a DB connection.
 */

const express = require('express');
const jwt = require('jsonwebtoken');

const { prisma } = require('../../src/lib/prisma');
const usersRouter = require('../../src/modules/users/users.routes');

// ── Helpers ───────────────────────────────────────────────────────────────────

const TEST_SECRET = 'test-secret'; // matches JWT_SECRET in tests/setup-env.js

function signToken(role) {
  return jwt.sign({ sub: 'user-1', scope: 'access', jti: `jti-${role}`, role }, TEST_SECRET, {
    expiresIn: '1h',
  });
}

function authHeader(role) {
  return { Authorization: `Bearer ${signToken(role)}` };
}

// ── Server setup ──────────────────────────────────────────────────────────────

let server;
let baseUrl;

beforeAll(async () => {
  const app = express();
  app.use(express.json());

  // Mount ONLY the users router — deliberately omit the global requireAuth
  // from app.js to prove the routes enforce auth at their own level.
  app.use('/api/users', usersRouter);

  app.use((err, _req, res, _next) => {
    res.status(err.status ?? 500).json({ status: 'error', message: err.message });
  });

  server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

afterAll(async () => {
  await new Promise((resolve, reject) => server.close((err) => (err ? reject(err) : resolve())));
});

beforeEach(() => {
  // Make all tokens appear "not revoked" so requireAuth passes for role tests.
  vi.spyOn(prisma.revokedToken, 'findUnique').mockResolvedValue(null);
});

// ─── POST / — explicit requireAuth (security fix) ────────────────────────────

describe('users routes — POST / (create user)', () => {
  it('returns 401 without token even when app.js global auth is absent', async () => {
    const res = await fetch(`${baseUrl}/api/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'new@example.com',
        password: 'Secret123!',
        nomeCompleto: 'New User',
        role: 'EDITOR',
      }),
    });
    expect(res.status).toBe(401);
  });

  it('returns 403 when token has EDITOR role', async () => {
    const res = await fetch(`${baseUrl}/api/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeader('EDITOR') },
      body: JSON.stringify({
        email: 'new@example.com',
        password: 'Secret123!',
        nomeCompleto: 'New User',
        role: 'EDITOR',
      }),
    });
    expect(res.status).toBe(403);
  });
});

// ─── PUT /:id — explicit requireAuth (security fix) ──────────────────────────

describe('users routes — PUT /:id (update user)', () => {
  it('returns 401 without token even when app.js global auth is absent', async () => {
    const res = await fetch(`${baseUrl}/api/users/some-user-id`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nomeCompleto: 'Updated Name' }),
    });
    expect(res.status).toBe(401);
  });

  it('returns 403 when token has EDITOR role', async () => {
    const res = await fetch(`${baseUrl}/api/users/some-user-id`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...authHeader('EDITOR') },
      body: JSON.stringify({ nomeCompleto: 'Updated Name' }),
    });
    expect(res.status).toBe(403);
  });
});

// ─── Existing routes remain protected ────────────────────────────────────────

describe('users routes — existing routes remain protected', () => {
  it('GET / returns 401 without token', async () => {
    const res = await fetch(`${baseUrl}/api/users`);
    expect(res.status).toBe(401);
  });

  it('GET /:id returns 401 without token', async () => {
    const res = await fetch(`${baseUrl}/api/users/some-id`);
    expect(res.status).toBe(401);
  });

  it('DELETE /:id returns 401 without token', async () => {
    const res = await fetch(`${baseUrl}/api/users/some-id`, { method: 'DELETE' });
    expect(res.status).toBe(401);
  });
});
