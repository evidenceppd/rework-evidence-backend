'use strict';

/**
 * Behavioral tests for the lead-submission rate limiter.
 *
 * Verifies the exact parameters used in diagnosis.routes.js:
 *   - 20 requests per minute per IP
 *   - 60-second block on breach
 *   - Per-IP isolation
 *   - Block releases after the configured duration
 */

const { createRequestRateLimiter } = require('../../src/middlewares/rate-limit');

// These constants must match the values in diagnosis.routes.js
const MAX_REQUESTS = 20;
const WINDOW_MS = 60 * 1000;
const BLOCK_DURATION_MS = 60 * 1000;

function makeReq(ip = '10.0.10.1') {
  return { ip };
}

function makeRes() {
  const headers = {};
  return {
    headers,
    setHeader(name, value) {
      headers[name] = value;
    },
  };
}

describe('lead submission rate limiter — behavioral', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it(`allows the first ${MAX_REQUESTS} requests from one IP`, () => {
    const limiter = createRequestRateLimiter({
      windowMs: WINDOW_MS,
      maxRequests: MAX_REQUESTS,
      blockDurationMs: BLOCK_DURATION_MS,
    });

    for (let i = 0; i < MAX_REQUESTS; i += 1) {
      const next = vi.fn();
      limiter(makeReq(), makeRes(), next);
      expect(next).toHaveBeenCalledWith();
    }
  });

  it(`blocks the ${MAX_REQUESTS + 1}th request and sets Retry-After: 60`, () => {
    const limiter = createRequestRateLimiter({
      windowMs: WINDOW_MS,
      maxRequests: MAX_REQUESTS,
      blockDurationMs: BLOCK_DURATION_MS,
    });

    // Fill up the limit
    for (let i = 0; i < MAX_REQUESTS; i += 1) {
      limiter(makeReq(), makeRes(), vi.fn());
    }

    // Breach
    const blockedNext = vi.fn();
    const blockedRes = makeRes();
    limiter(makeReq(), blockedRes, blockedNext);

    const err = blockedNext.mock.calls[0][0];
    expect(err).toBeDefined();
    expect(err.status).toBe(429);
    expect(blockedRes.headers['Retry-After']).toBe('60');
  });

  it('continues blocking subsequent requests after the breach', () => {
    const limiter = createRequestRateLimiter({
      windowMs: WINDOW_MS,
      maxRequests: MAX_REQUESTS,
      blockDurationMs: BLOCK_DURATION_MS,
    });

    for (let i = 0; i <= MAX_REQUESTS; i += 1) {
      limiter(makeReq('10.0.10.2'), makeRes(), vi.fn());
    }

    // Request immediately after block should also be rejected
    const next = vi.fn();
    limiter(makeReq('10.0.10.2'), makeRes(), next);
    expect(next.mock.calls[0][0].status).toBe(429);
  });

  it('releases the block after blockDurationMs elapses', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'));

    const limiter = createRequestRateLimiter({
      windowMs: WINDOW_MS,
      maxRequests: MAX_REQUESTS,
      blockDurationMs: BLOCK_DURATION_MS,
    });

    // Trigger block
    for (let i = 0; i <= MAX_REQUESTS; i += 1) {
      limiter(makeReq('10.0.10.3'), makeRes(), vi.fn());
    }

    // Advance past the block window
    vi.advanceTimersByTime(BLOCK_DURATION_MS + 100);

    const releasedNext = vi.fn();
    limiter(makeReq('10.0.10.3'), makeRes(), releasedNext);
    expect(releasedNext).toHaveBeenCalledWith();
  });

  it('isolates rate limit counters per IP address', () => {
    const limiter = createRequestRateLimiter({
      windowMs: WINDOW_MS,
      maxRequests: MAX_REQUESTS,
      blockDurationMs: BLOCK_DURATION_MS,
    });

    // Exhaust limit for IP A
    for (let i = 0; i <= MAX_REQUESTS; i += 1) {
      limiter(makeReq('192.168.1.10'), makeRes(), vi.fn());
    }

    // IP B should still be unaffected
    const ipBNext = vi.fn();
    limiter(makeReq('192.168.1.11'), makeRes(), ipBNext);
    expect(ipBNext).toHaveBeenCalledWith();
  });

  it('uses the correct Retry-After value matching blockDurationMs', () => {
    const limiter = createRequestRateLimiter({
      windowMs: WINDOW_MS,
      maxRequests: MAX_REQUESTS,
      blockDurationMs: BLOCK_DURATION_MS,
    });

    for (let i = 0; i <= MAX_REQUESTS; i += 1) {
      limiter(makeReq('10.0.10.4'), makeRes(), vi.fn());
    }

    const blockedRes = makeRes();
    const next = vi.fn();
    limiter(makeReq('10.0.10.4'), blockedRes, next);

    const expectedRetryAfter = String(Math.ceil(BLOCK_DURATION_MS / 1000));
    expect(blockedRes.headers['Retry-After']).toBe(expectedRetryAfter);
  });
});
