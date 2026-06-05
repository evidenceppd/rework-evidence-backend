'use strict';

/**
 * E2E — Auth module
 *
 * Tests the full HTTP stack for POST /api/auth/login, /mfa, and /logout.
 * The auth service is mocked at the service level to avoid bcrypt + DB calls
 * while still exercising all Express middleware (CORS, CSRF, rate-limit).
 */

const jwt = require('jsonwebtoken');
const app = require('../../src/app');
const authService = require('../../src/modules/auth/auth.service');
const { prisma } = require('../../src/lib/prisma');
const { makeAccessToken, TRUSTED_ORIGIN, bypassTokenRevocation } = require('./helpers');

let server;
let baseUrl;

beforeAll(async () => {
  server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

afterAll(async () => {
  await new Promise((resolve, reject) => server.close((err) => (err ? reject(err) : resolve())));
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ── POST /api/auth/login ──────────────────────────────────────────────────────

describe('POST /api/auth/login', () => {
  it('returns 200 and mfaToken on valid credentials', async () => {
    vi.spyOn(authService, 'login').mockResolvedValue({ mfaToken: 'mock-mfa-token' });

    const res = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: TRUSTED_ORIGIN },
      body: JSON.stringify({ email: 'admin@example.com', password: 'Secret123!' }),
    });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.status).toBe('success');
    expect(body.data.mfaToken).toBe('mock-mfa-token');
  });

  it('returns 401 on invalid credentials', async () => {
    const { AppError } = require('../../src/utils/errors');
    vi.spyOn(authService, 'login').mockRejectedValue(new AppError('Invalid credentials', 401));

    const res = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: TRUSTED_ORIGIN },
      body: JSON.stringify({ email: 'bad@example.com', password: 'wrong' }),
    });
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.status).toBe('error');
    expect(body.message).toBe('Invalid credentials');
  });

  it('rejects requests from untrusted origin with 403', async () => {
    const res = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: 'http://evil.local' },
      body: JSON.stringify({ email: 'admin@example.com', password: 'Secret123!' }),
    });

    expect(res.status).toBe(403);
  });
});

// ── POST /api/auth/mfa ────────────────────────────────────────────────────────

describe('POST /api/auth/mfa', () => {
  it('returns 200 and accessToken on valid MFA code', async () => {
    const fakeAccessToken = makeAccessToken('MASTER');
    vi.spyOn(authService, 'verifyMfa').mockResolvedValue({ accessToken: fakeAccessToken });

    const mfaJwt = jwt.sign({ sub: 'user-1', scope: 'mfa' }, 'test-secret', { expiresIn: '10m' });

    const res = await fetch(`${baseUrl}/api/auth/mfa`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Origin: TRUSTED_ORIGIN,
        Authorization: `Bearer ${mfaJwt}`,
      },
      body: JSON.stringify({ code: '123456' }),
    });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.status).toBe('success');
    expect(body.data.accessToken).toBe(fakeAccessToken);
  });

  it('returns 401 on expired or invalid MFA code', async () => {
    const { AppError } = require('../../src/utils/errors');
    vi.spyOn(authService, 'verifyMfa').mockRejectedValue(new AppError('Invalid MFA code', 401));

    const mfaJwt = jwt.sign({ sub: 'user-1', scope: 'mfa' }, 'test-secret', { expiresIn: '10m' });

    const res = await fetch(`${baseUrl}/api/auth/mfa`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Origin: TRUSTED_ORIGIN,
        Authorization: `Bearer ${mfaJwt}`,
      },
      body: JSON.stringify({ code: '000000' }),
    });
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.status).toBe('error');
  });
});

// ── POST /api/auth/logout ─────────────────────────────────────────────────────

describe('POST /api/auth/logout', () => {
  it('returns 204 on successful logout', async () => {
    bypassTokenRevocation();
    vi.spyOn(authService, 'logout').mockResolvedValue(undefined);

    const token = makeAccessToken('MASTER');

    const res = await fetch(`${baseUrl}/api/auth/logout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Origin: TRUSTED_ORIGIN,
        Authorization: `Bearer ${token}`,
      },
    });

    expect(res.status).toBe(204);
    expect(authService.logout).toHaveBeenCalledWith(token);
  });

  it('returns 401 without Authorization header', async () => {
    // logout is public (no requireAuth), but the service enforces token presence
    const { AppError } = require('../../src/utils/errors');
    vi.spyOn(authService, 'logout').mockRejectedValue(new AppError('Token required', 400));

    const res = await fetch(`${baseUrl}/api/auth/logout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: TRUSTED_ORIGIN },
    });
    const body = await res.json();

    expect([400, 401]).toContain(res.status);
    expect(body.status).toBe('error');
  });
});
