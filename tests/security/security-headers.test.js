'use strict';

const securityHeaders = require('../../src/middlewares/security-headers');

function createResCollector() {
  const headers = {};
  return {
    headers,
    setHeader: vi.fn((name, value) => {
      headers[name] = value;
    }),
  };
}

describe('securityHeaders middleware', () => {
  it('sets baseline security headers', () => {
    const req = { path: '/api/blog' };
    const res = createResCollector();
    const next = vi.fn();

    securityHeaders(req, res, next);

    expect(res.headers['X-Content-Type-Options']).toBe('nosniff');
    expect(res.headers['X-Frame-Options']).toBe('DENY');
    expect(res.headers['Referrer-Policy']).toBe('no-referrer');
    expect(res.headers['X-Permitted-Cross-Domain-Policies']).toBe('none');
    expect(res.headers['Permissions-Policy']).toBe('camera=(), microphone=(), geolocation=()');
    expect(res.headers['Content-Security-Policy']).toContain("default-src 'none'");
    expect(next).toHaveBeenCalledWith();
  });

  it('does not set CSP for swagger docs path', () => {
    const req = { path: '/api/docs' };
    const res = createResCollector();
    const next = vi.fn();

    securityHeaders(req, res, next);

    expect(res.headers['Content-Security-Policy']).toBeUndefined();
    expect(next).toHaveBeenCalledWith();
  });
});
