'use strict';

const { requireTrustedOrigin } = require('../../src/middlewares/csrf');

function createReq({ method = 'GET', origin, referer } = {}) {
  return {
    method,
    headers: {
      origin,
      referer,
    },
  };
}

describe('requireTrustedOrigin middleware', () => {
  it('allows safe methods without origin checks', () => {
    const req = createReq({ method: 'GET' });
    const next = vi.fn();

    requireTrustedOrigin(req, {}, next);

    expect(next).toHaveBeenCalledWith();
  });

  it('allows non-browser write requests without Origin/Referer', () => {
    const req = createReq({ method: 'POST' });
    const next = vi.fn();

    requireTrustedOrigin(req, {}, next);

    expect(next).toHaveBeenCalledWith();
  });

  it('allows trusted Origin on write requests', () => {
    const req = createReq({ method: 'PATCH', origin: 'http://trusted.local' });
    const next = vi.fn();

    requireTrustedOrigin(req, {}, next);

    expect(next).toHaveBeenCalledWith();
  });

  it('blocks untrusted Origin on write requests', () => {
    const req = createReq({ method: 'DELETE', origin: 'http://evil.local' });
    const next = vi.fn();

    requireTrustedOrigin(req, {}, next);

    const err = next.mock.calls[0][0];
    expect(err).toBeDefined();
    expect(err.status).toBe(403);
    expect(err.message).toBe('Request origin is not allowed');
  });

  it('uses Referer origin when Origin header is absent', () => {
    const req = createReq({ method: 'POST', referer: 'http://trusted.local/admin/page' });
    const next = vi.fn();

    requireTrustedOrigin(req, {}, next);

    expect(next).toHaveBeenCalledWith();
  });
});
