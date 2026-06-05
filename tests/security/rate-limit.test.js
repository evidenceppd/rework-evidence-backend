'use strict';

const { createFailureRateLimiter, createRequestRateLimiter } = require('../../src/middlewares/rate-limit');

function createReq({ ip = '127.0.0.1', body = {}, headers = {} } = {}) {
  return {
    ip,
    body,
    headers,
    socket: { remoteAddress: ip },
  };
}

function createRes(initialStatusCode = 200) {
  const listeners = new Map();
  const headers = {};

  return {
    statusCode: initialStatusCode,
    headers,
    setHeader(name, value) {
      headers[name] = value;
    },
    once(event, handler) {
      listeners.set(event, handler);
    },
    finish() {
      const handler = listeners.get('finish');
      if (handler) {
        handler();
      }
    },
  };
}

describe('createFailureRateLimiter', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('blocks requests after configured number of failed attempts', () => {
    const limiter = createFailureRateLimiter({
      name: 'test-block',
      keyGenerator: (req) => req.ip,
      maxFailures: 2,
      windowMs: 10_000,
      blockDurationsMs: [60_000],
    });

    for (let attempt = 0; attempt < 2; attempt += 1) {
      const req = createReq();
      const res = createRes(401);
      const next = vi.fn();

      limiter(req, res, next);
      res.finish();

      expect(next).toHaveBeenCalledWith();
    }

    const blockedReq = createReq();
    const blockedRes = createRes();
    const blockedNext = vi.fn();

    limiter(blockedReq, blockedRes, blockedNext);

    const err = blockedNext.mock.calls[0][0];
    expect(err).toBeDefined();
    expect(err.status).toBe(429);
    expect(blockedRes.headers['Retry-After']).toBe('60');
  });

  it('resets failure counter after successful authentication response', () => {
    const limiter = createFailureRateLimiter({
      name: 'test-reset',
      keyGenerator: (req) => req.ip,
      maxFailures: 2,
      windowMs: 10_000,
      blockDurationsMs: [60_000],
    });

    const failReq = createReq();
    const failRes = createRes(401);
    const failNext = vi.fn();
    limiter(failReq, failRes, failNext);
    failRes.finish();

    const successReq = createReq();
    const successRes = createRes(200);
    const successNext = vi.fn();
    limiter(successReq, successRes, successNext);
    successRes.finish();

    const nextFailReq = createReq();
    const nextFailRes = createRes(401);
    const nextFailNext = vi.fn();
    limiter(nextFailReq, nextFailRes, nextFailNext);
    nextFailRes.finish();

    const shouldStillBeAllowedReq = createReq();
    const shouldStillBeAllowedRes = createRes(200);
    const shouldStillBeAllowedNext = vi.fn();
    limiter(shouldStillBeAllowedReq, shouldStillBeAllowedRes, shouldStillBeAllowedNext);

    expect(shouldStillBeAllowedNext).toHaveBeenCalledWith();
  });

  it('applies progressive blocking durations on repeated failures', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'));

    const limiter = createFailureRateLimiter({
      name: 'test-progressive',
      keyGenerator: (req) => req.ip,
      maxFailures: 1,
      windowMs: 10_000,
      blockDurationsMs: [1_000, 5_000],
    });

    const firstFailReq = createReq();
    const firstFailRes = createRes(401);
    const firstFailNext = vi.fn();
    limiter(firstFailReq, firstFailRes, firstFailNext);
    firstFailRes.finish();

    const firstBlockedReq = createReq();
    const firstBlockedRes = createRes();
    const firstBlockedNext = vi.fn();
    limiter(firstBlockedReq, firstBlockedRes, firstBlockedNext);

    const firstErr = firstBlockedNext.mock.calls[0][0];
    expect(firstErr.status).toBe(429);
    expect(firstBlockedRes.headers['Retry-After']).toBe('1');

    vi.advanceTimersByTime(1_100);

    const secondFailReq = createReq();
    const secondFailRes = createRes(401);
    const secondFailNext = vi.fn();
    limiter(secondFailReq, secondFailRes, secondFailNext);
    secondFailRes.finish();

    const secondBlockedReq = createReq();
    const secondBlockedRes = createRes();
    const secondBlockedNext = vi.fn();
    limiter(secondBlockedReq, secondBlockedRes, secondBlockedNext);

    const secondErr = secondBlockedNext.mock.calls[0][0];
    expect(secondErr.status).toBe(429);
    expect(secondBlockedRes.headers['Retry-After']).toBe('5');
  });
});

describe('createRequestRateLimiter', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('allows requests within the limit', () => {
    const limiter = createRequestRateLimiter({
      windowMs: 10_000,
      maxRequests: 3,
      blockDurationMs: 30_000,
    });

    for (let i = 0; i < 3; i += 1) {
      const next = vi.fn();
      limiter(createReq(), createRes(), next);
      expect(next).toHaveBeenCalledWith();
    }
  });

  it('blocks the request that exceeds the limit', () => {
    const limiter = createRequestRateLimiter({
      windowMs: 10_000,
      maxRequests: 2,
      blockDurationMs: 30_000,
    });

    for (let i = 0; i < 2; i += 1) {
      limiter(createReq(), createRes(), vi.fn());
    }

    const next = vi.fn();
    const res = createRes();
    limiter(createReq(), res, next);

    const err = next.mock.calls[0][0];
    expect(err).toBeDefined();
    expect(err.status).toBe(429);
    expect(res.headers['Retry-After']).toBe('30');
  });

  it('releases the block after blockDurationMs', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'));

    const limiter = createRequestRateLimiter({
      windowMs: 5_000,
      maxRequests: 1,
      blockDurationMs: 10_000,
    });

    // Esgota o limite
    limiter(createReq(), createRes(), vi.fn());
    const blockedNext = vi.fn();
    limiter(createReq(), createRes(), blockedNext);
    expect(blockedNext.mock.calls[0][0].status).toBe(429);

    // Avança além do blockDurationMs
    vi.advanceTimersByTime(10_100);

    const releasedNext = vi.fn();
    limiter(createReq(), createRes(), releasedNext);
    expect(releasedNext).toHaveBeenCalledWith();
  });

  it('isolates counters per IP', () => {
    const limiter = createRequestRateLimiter({
      windowMs: 10_000,
      maxRequests: 1,
      blockDurationMs: 30_000,
    });

    // IP A esgota o limite
    limiter(createReq({ ip: '10.0.0.1' }), createRes(), vi.fn());
    const blockedNext = vi.fn();
    limiter(createReq({ ip: '10.0.0.1' }), createRes(), blockedNext);
    expect(blockedNext.mock.calls[0][0].status).toBe(429);

    // IP B ainda deve passar
    const ipBNext = vi.fn();
    limiter(createReq({ ip: '10.0.0.2' }), createRes(), ipBNext);
    expect(ipBNext).toHaveBeenCalledWith();
  });

  it('throws on invalid options', () => {
    expect(() => createRequestRateLimiter({ windowMs: 0, maxRequests: 5, blockDurationMs: 1000 }))
      .toThrow('windowMs');
    expect(() => createRequestRateLimiter({ windowMs: 1000, maxRequests: 0, blockDurationMs: 1000 }))
      .toThrow('maxRequests');
    expect(() => createRequestRateLimiter({ windowMs: 1000, maxRequests: 5, blockDurationMs: 0 }))
      .toThrow('blockDurationMs');
  });
});
