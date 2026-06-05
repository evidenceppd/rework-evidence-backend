'use strict';

const { requireRole } = require('../../src/middlewares/role');

function createReq(role) {
  return { adminRole: role };
}

describe('requireRole middleware', () => {
  it('calls next() when actor has an allowed role', () => {
    const req = createReq('MASTER');
    const next = vi.fn();

    requireRole('MASTER', 'ADMIN')(req, {}, next);

    expect(next).toHaveBeenCalledWith();
  });

  it('calls next() for any of the listed allowed roles', () => {
    const next = vi.fn();

    requireRole('MASTER', 'ADMIN')(createReq('ADMIN'), {}, next);

    expect(next).toHaveBeenCalledWith();
  });

  it('calls next() with 403 error when role is not allowed', () => {
    const req = createReq('EDITOR');
    const next = vi.fn();

    requireRole('MASTER', 'ADMIN')(req, {}, next);

    const err = next.mock.calls[0][0];
    expect(err).toBeDefined();
    expect(err.status).toBe(403);
    expect(err.message).toBe('Insufficient permissions');
  });

  it('calls next() with 401 error when adminRole is missing', () => {
    const req = {};
    const next = vi.fn();

    requireRole('MASTER')(req, {}, next);

    const err = next.mock.calls[0][0];
    expect(err).toBeDefined();
    expect(err.status).toBe(401);
    expect(err.message).toBe('Authentication required');
  });

  it('rejects EDITOR when only MASTER is allowed', () => {
    const req = createReq('EDITOR');
    const next = vi.fn();

    requireRole('MASTER')(req, {}, next);

    const err = next.mock.calls[0][0];
    expect(err.status).toBe(403);
  });

  it('allows EDITOR when EDITOR is explicitly listed', () => {
    const req = createReq('EDITOR');
    const next = vi.fn();

    requireRole('EDITOR')(req, {}, next);

    expect(next).toHaveBeenCalledWith();
  });
});
