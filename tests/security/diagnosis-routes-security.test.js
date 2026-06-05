'use strict';

/**
 * Route-level security integration tests for the diagnosis module.
 *
 * Verifies that:
 *  - Public endpoints are accessible without auth.
 *  - Admin-only endpoints enforce requireAuth + requireRole('MASTER','ADMIN').
 *  - EDITOR tokens are rejected with 403 on all admin-only endpoints.
 *  - Requests without a token are rejected with 401.
 *  - Anonymous GET /forms always receives activeOnly=true regardless of query param.
 *
 * Strategy: mount only the diagnosis router in a minimal Express app.
 * Use vi.spyOn on the service module (shared CJS reference) and on
 * prisma.revokedToken.findUnique (intercepted before the JWT middleware calls
 * isTokenRevoked) so no real DB connection is required.
 */

const express = require('express');
const jwt = require('jsonwebtoken');

const service = require('../../src/modules/diagnosis/diagnosis.service');
const { prisma } = require('../../src/lib/prisma');
const diagnosisRouter = require('../../src/modules/diagnosis/diagnosis.routes');

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
  app.use('/api/diagnosis', diagnosisRouter);
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
  // prisma.revokedToken.findUnique is called inside isTokenRevoked() in auth.repository.js.
  vi.spyOn(prisma.revokedToken, 'findUnique').mockResolvedValue(null);

  // Default service stubs so controllers reach 2xx when auth passes.
  vi.spyOn(service, 'listForms').mockResolvedValue([]);
  vi.spyOn(service, 'getFormBySlug').mockResolvedValue({
    slug: 'commerce',
    title: 'Commerce',
    description: null,
    sections: [],
  });
  vi.spyOn(service, 'createForm').mockResolvedValue({ id: 'f-1', slug: 'new-form', title: 'New', sections: [] });
  vi.spyOn(service, 'updateForm').mockResolvedValue({ id: 'f-1', slug: 'commerce', title: 'Updated' });
  vi.spyOn(service, 'deleteForm').mockResolvedValue(undefined);
  vi.spyOn(service, 'listLeads').mockResolvedValue([]);
  vi.spyOn(service, 'getLeadById').mockResolvedValue({ id: 'lead-1', score: 0, leadTemperature: 'cold' });
  vi.spyOn(service, 'updateLeadStatus').mockResolvedValue({ id: 'lead-1', status: 'contacted' });
  vi.spyOn(service, 'submitLead').mockResolvedValue({ id: 'lead-1', score: 0, leadTemperature: 'cold' });
});

// ─── Public endpoints ─────────────────────────────────────────────────────────

describe('diagnosis routes — public endpoints', () => {
  it('GET /forms is accessible without auth', async () => {
    const res = await fetch(`${baseUrl}/api/diagnosis/forms`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('success');
  });

  it('GET /forms/:slug/questions is accessible without auth', async () => {
    const res = await fetch(`${baseUrl}/api/diagnosis/forms/commerce/questions`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('success');
  });

  it('POST / (lead submission) is accessible without auth', async () => {
    const res = await fetch(`${baseUrl}/api/diagnosis`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ formType: 'commerce' }),
    });
    expect(res.status).toBe(201);
  });
});

// ─── POST /forms — create form (MASTER/ADMIN only) ────────────────────────────

describe('diagnosis routes — POST /forms (create form)', () => {
  it('returns 401 when no token is provided', async () => {
    const res = await fetch(`${baseUrl}/api/diagnosis/forms`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slug: 'new', title: 'New', sections: [] }),
    });
    expect(res.status).toBe(401);
  });

  it('returns 403 when token has EDITOR role', async () => {
    const res = await fetch(`${baseUrl}/api/diagnosis/forms`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeader('EDITOR') },
      body: JSON.stringify({ slug: 'new', title: 'New', sections: [] }),
    });
    expect(res.status).toBe(403);
  });

  it('returns 201 when token has MASTER role', async () => {
    const res = await fetch(`${baseUrl}/api/diagnosis/forms`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeader('MASTER') },
      body: JSON.stringify({ slug: 'new', title: 'New', sections: [] }),
    });
    expect(res.status).toBe(201);
  });

  it('returns 201 when token has ADMIN role', async () => {
    const res = await fetch(`${baseUrl}/api/diagnosis/forms`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeader('ADMIN') },
      body: JSON.stringify({ slug: 'another', title: 'Another', sections: [] }),
    });
    expect(res.status).toBe(201);
  });
});

// ─── PATCH /forms/:slug — update form (MASTER/ADMIN only) ────────────────────

describe('diagnosis routes — PATCH /forms/:slug (update form)', () => {
  it('returns 401 when no token is provided', async () => {
    const res = await fetch(`${baseUrl}/api/diagnosis/forms/commerce`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Updated' }),
    });
    expect(res.status).toBe(401);
  });

  it('returns 403 when token has EDITOR role', async () => {
    const res = await fetch(`${baseUrl}/api/diagnosis/forms/commerce`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...authHeader('EDITOR') },
      body: JSON.stringify({ title: 'Updated' }),
    });
    expect(res.status).toBe(403);
  });

  it('returns 200 when token has MASTER role', async () => {
    const res = await fetch(`${baseUrl}/api/diagnosis/forms/commerce`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...authHeader('MASTER') },
      body: JSON.stringify({ title: 'Updated' }),
    });
    expect(res.status).toBe(200);
  });
});

// ─── DELETE /forms/:slug — delete form (MASTER/ADMIN only) ───────────────────

describe('diagnosis routes — DELETE /forms/:slug (delete form)', () => {
  it('returns 401 when no token is provided', async () => {
    const res = await fetch(`${baseUrl}/api/diagnosis/forms/commerce`, { method: 'DELETE' });
    expect(res.status).toBe(401);
  });

  it('returns 403 when token has EDITOR role', async () => {
    const res = await fetch(`${baseUrl}/api/diagnosis/forms/commerce`, {
      method: 'DELETE',
      headers: authHeader('EDITOR'),
    });
    expect(res.status).toBe(403);
  });

  it('returns 204 when token has MASTER role', async () => {
    const res = await fetch(`${baseUrl}/api/diagnosis/forms/commerce`, {
      method: 'DELETE',
      headers: authHeader('MASTER'),
    });
    expect(res.status).toBe(204);
  });
});

// ─── GET /leads — list leads (MASTER/ADMIN only) ──────────────────────────────

describe('diagnosis routes — GET /leads (list leads)', () => {
  it('returns 401 when no token is provided', async () => {
    const res = await fetch(`${baseUrl}/api/diagnosis/leads`);
    expect(res.status).toBe(401);
  });

  it('returns 403 when token has EDITOR role', async () => {
    const res = await fetch(`${baseUrl}/api/diagnosis/leads`, { headers: authHeader('EDITOR') });
    expect(res.status).toBe(403);
  });

  it('returns 200 when token has MASTER role', async () => {
    const res = await fetch(`${baseUrl}/api/diagnosis/leads`, { headers: authHeader('MASTER') });
    expect(res.status).toBe(200);
  });

  it('returns 200 when token has ADMIN role', async () => {
    const res = await fetch(`${baseUrl}/api/diagnosis/leads`, { headers: authHeader('ADMIN') });
    expect(res.status).toBe(200);
  });
});

// ─── GET /leads/:id — get lead (MASTER/ADMIN only) ───────────────────────────

describe('diagnosis routes — GET /leads/:id (get lead)', () => {
  it('returns 401 when no token is provided', async () => {
    const res = await fetch(`${baseUrl}/api/diagnosis/leads/lead-1`);
    expect(res.status).toBe(401);
  });

  it('returns 403 when token has EDITOR role', async () => {
    const res = await fetch(`${baseUrl}/api/diagnosis/leads/lead-1`, { headers: authHeader('EDITOR') });
    expect(res.status).toBe(403);
  });

  it('returns 200 when token has MASTER role', async () => {
    const res = await fetch(`${baseUrl}/api/diagnosis/leads/lead-1`, { headers: authHeader('MASTER') });
    expect(res.status).toBe(200);
  });
});

// ─── PATCH /leads/:id/status — update status (MASTER/ADMIN only) ─────────────

describe('diagnosis routes — PATCH /leads/:id/status (update status)', () => {
  it('returns 401 when no token is provided', async () => {
    const res = await fetch(`${baseUrl}/api/diagnosis/leads/lead-1/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'contacted' }),
    });
    expect(res.status).toBe(401);
  });

  it('returns 403 when token has EDITOR role', async () => {
    const res = await fetch(`${baseUrl}/api/diagnosis/leads/lead-1/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...authHeader('EDITOR') },
      body: JSON.stringify({ status: 'contacted' }),
    });
    expect(res.status).toBe(403);
  });

  it('returns 200 when token has MASTER role', async () => {
    const res = await fetch(`${baseUrl}/api/diagnosis/leads/lead-1/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...authHeader('MASTER') },
      body: JSON.stringify({ status: 'contacted' }),
    });
    expect(res.status).toBe(200);
  });
});

// ─── GET /forms — activeOnly guard ───────────────────────────────────────────

describe('diagnosis routes — GET /forms activeOnly guard', () => {
  it('calls service.listForms(true) when anonymous passes activeOnly=false', async () => {
    await fetch(`${baseUrl}/api/diagnosis/forms?activeOnly=false`);
    expect(service.listForms).toHaveBeenCalledWith(true);
  });

  it('calls service.listForms(true) even when MASTER token passes activeOnly=false (route has no requireAuth)', async () => {
    // GET /forms is a public route — requireAuth never runs, req.adminRole is never
    // set, so the activeOnly guard in the controller always forces activeOnly=true.
    await fetch(`${baseUrl}/api/diagnosis/forms?activeOnly=false`, { headers: authHeader('MASTER') });
    expect(service.listForms).toHaveBeenCalledWith(true);
  });

  it('calls service.listForms(true) when MASTER does not pass activeOnly', async () => {
    await fetch(`${baseUrl}/api/diagnosis/forms`, { headers: authHeader('MASTER') });
    expect(service.listForms).toHaveBeenCalledWith(true);
  });
});
