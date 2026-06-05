'use strict';

/**
 * E2E — Users module
 *
 * Tests the full HTTP cycle for:
 *   GET    /api/users        (list, requires MASTER or ADMIN)
 *   POST   /api/users        (create, requires MASTER or ADMIN)
 *   GET    /api/users/:id    (single user, requires MASTER or ADMIN)
 *   PUT    /api/users/:id    (update, requires MASTER or ADMIN)
 *   DELETE /api/users/:id    (delete, requires MASTER only)
 *
 * Verifies that role-based access is enforced at the route level:
 * EDITOR cannot read, create, update or delete users.
 */

const app = require('../../src/app');
const usersService = require('../../src/modules/users/users.service');
const { authHeaders, bypassTokenRevocation } = require('./helpers');
const { AppError } = require('../../src/utils/errors');

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

beforeEach(() => {
  bypassTokenRevocation();
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ── GET /api/users ────────────────────────────────────────────────────────────

describe('GET /api/users', () => {
  const mockUsers = [
    { id: 'u-1', email: 'master@agency.com', nomeCompleto: 'Master User', role: 'MASTER', active: true },
    { id: 'u-2', email: 'editor@agency.com', nomeCompleto: 'Editor User', role: 'EDITOR', active: true },
  ];

  it('returns 200 with user list for MASTER', async () => {
    vi.spyOn(usersService, 'listUsers').mockResolvedValue(mockUsers);

    const res = await fetch(`${baseUrl}/api/users`, {
      headers: authHeaders('MASTER'),
    });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.status).toBe('success');
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.data).toHaveLength(2);
  });

  it('returns 200 with user list for ADMIN', async () => {
    vi.spyOn(usersService, 'listUsers').mockResolvedValue(mockUsers);

    const res = await fetch(`${baseUrl}/api/users`, {
      headers: authHeaders('ADMIN'),
    });

    expect(res.status).toBe(200);
  });

  it('returns 403 for EDITOR role', async () => {
    const res = await fetch(`${baseUrl}/api/users`, {
      headers: authHeaders('EDITOR'),
    });

    expect(res.status).toBe(403);
  });

  it('returns 401 without token', async () => {
    const res = await fetch(`${baseUrl}/api/users`);

    expect(res.status).toBe(401);
  });
});

// ── POST /api/users ───────────────────────────────────────────────────────────

describe('POST /api/users', () => {
  const newUser = {
    email: 'new-editor@agency.com',
    nomeCompleto: 'New Editor',
    password: 'Secret123!',
    role: 'EDITOR',
  };

  it('returns 201 and created user for MASTER', async () => {
    vi.spyOn(usersService, 'createUser').mockResolvedValue({ id: 'u-3', ...newUser, passwordHash: undefined, active: true });

    const res = await fetch(`${baseUrl}/api/users`, {
      method: 'POST',
      headers: authHeaders('MASTER'),
      body: JSON.stringify(newUser),
    });
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.status).toBe('success');
    expect(body.data.email).toBe('new-editor@agency.com');
  });

  it('returns 403 for EDITOR role', async () => {
    const res = await fetch(`${baseUrl}/api/users`, {
      method: 'POST',
      headers: authHeaders('EDITOR'),
      body: JSON.stringify(newUser),
    });

    expect(res.status).toBe(403);
  });

  it('returns 401 without token', async () => {
    const res = await fetch(`${baseUrl}/api/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: 'http://trusted.local' },
      body: JSON.stringify(newUser),
    });

    expect(res.status).toBe(401);
  });

  it('returns 409 when email is already in use', async () => {
    vi.spyOn(usersService, 'createUser').mockRejectedValue(new AppError('Email already in use', 409));

    const res = await fetch(`${baseUrl}/api/users`, {
      method: 'POST',
      headers: authHeaders('MASTER'),
      body: JSON.stringify(newUser),
    });
    const body = await res.json();

    expect(res.status).toBe(409);
    expect(body.status).toBe('error');
  });
});

// ── GET /api/users/:id ────────────────────────────────────────────────────────

describe('GET /api/users/:id', () => {
  it('returns 200 with the requested user for MASTER', async () => {
    const mockUser = { id: 'u-2', email: 'editor@agency.com', nomeCompleto: 'Editor User', role: 'EDITOR', active: true };
    vi.spyOn(usersService, 'getUser').mockResolvedValue(mockUser);

    const res = await fetch(`${baseUrl}/api/users/u-2`, {
      headers: authHeaders('MASTER'),
    });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.id).toBe('u-2');
    expect(usersService.getUser).toHaveBeenCalledWith('u-2', 'MASTER');
  });

  it('returns 403 for EDITOR role', async () => {
    const res = await fetch(`${baseUrl}/api/users/u-2`, {
      headers: authHeaders('EDITOR'),
    });

    expect(res.status).toBe(403);
  });

  it('returns 404 when user does not exist', async () => {
    vi.spyOn(usersService, 'getUser').mockRejectedValue(new AppError('User not found', 404));

    const res = await fetch(`${baseUrl}/api/users/ghost`, {
      headers: authHeaders('MASTER'),
    });

    expect(res.status).toBe(404);
  });
});

// ── PUT /api/users/:id ────────────────────────────────────────────────────────

describe('PUT /api/users/:id', () => {
  it('returns 200 with updated user for MASTER', async () => {
    const updated = { id: 'u-2', email: 'editor@agency.com', nomeCompleto: 'Updated Editor', role: 'EDITOR', active: true };
    vi.spyOn(usersService, 'updateUser').mockResolvedValue(updated);

    const res = await fetch(`${baseUrl}/api/users/u-2`, {
      method: 'PUT',
      headers: authHeaders('MASTER'),
      body: JSON.stringify({ nomeCompleto: 'Updated Editor' }),
    });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.nomeCompleto).toBe('Updated Editor');
  });

  it('returns 403 for EDITOR role', async () => {
    const res = await fetch(`${baseUrl}/api/users/u-2`, {
      method: 'PUT',
      headers: authHeaders('EDITOR'),
      body: JSON.stringify({ nomeCompleto: 'Hack' }),
    });

    expect(res.status).toBe(403);
  });

  it('returns 401 without token', async () => {
    const res = await fetch(`${baseUrl}/api/users/u-2`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Origin: 'http://trusted.local' },
      body: JSON.stringify({ nomeCompleto: 'Anon' }),
    });

    expect(res.status).toBe(401);
  });
});

// ── DELETE /api/users/:id ─────────────────────────────────────────────────────

describe('DELETE /api/users/:id', () => {
  it('returns 204 on successful delete for MASTER', async () => {
    vi.spyOn(usersService, 'deleteUser').mockResolvedValue(undefined);

    const res = await fetch(`${baseUrl}/api/users/u-2`, {
      method: 'DELETE',
      headers: authHeaders('MASTER'),
    });

    expect(res.status).toBe(204);
    expect(usersService.deleteUser).toHaveBeenCalledWith('u-2', 'MASTER');
  });

  it('returns 403 for ADMIN role (only MASTER can delete)', async () => {
    const res = await fetch(`${baseUrl}/api/users/u-2`, {
      method: 'DELETE',
      headers: authHeaders('ADMIN'),
    });

    expect(res.status).toBe(403);
  });

  it('returns 401 without token', async () => {
    const res = await fetch(`${baseUrl}/api/users/u-2`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json', Origin: 'http://trusted.local' },
    });

    expect(res.status).toBe(401);
  });

  it('returns 404 when user does not exist', async () => {
    vi.spyOn(usersService, 'deleteUser').mockRejectedValue(new AppError('User not found', 404));

    const res = await fetch(`${baseUrl}/api/users/ghost`, {
      method: 'DELETE',
      headers: authHeaders('MASTER'),
    });
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body.status).toBe('error');
  });
});
