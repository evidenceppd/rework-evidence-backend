'use strict';

const { AppError } = require('../utils/errors');

function createFailureRateLimiter(options) {
  const {
    name,
    keyGenerator,
    maxFailures,
    windowMs,
    blockDurationsMs,
    trackedStatusCodes = new Set([400, 401, 403]),
  } = options;

  if (!name || typeof name !== 'string') {
    throw new Error('rate limiter requires a string name');
  }
  if (typeof keyGenerator !== 'function') {
    throw new Error('rate limiter requires a keyGenerator function');
  }
  if (!Number.isInteger(maxFailures) || maxFailures < 1) {
    throw new Error('rate limiter requires maxFailures >= 1');
  }
  if (!Number.isInteger(windowMs) || windowMs < 1) {
    throw new Error('rate limiter requires windowMs >= 1');
  }
  if (!Array.isArray(blockDurationsMs) || blockDurationsMs.length === 0) {
    throw new Error('rate limiter requires at least one block duration');
  }

  const durations = blockDurationsMs.map((value) => {
    if (!Number.isInteger(value) || value < 1) {
      throw new Error('rate limiter block durations must be integers >= 1');
    }
    return value;
  });

  const stateByKey = new Map();
  const maxBlockMs = Math.max(...durations);
  const staleAfterMs = Math.max(windowMs, maxBlockMs) * 3;
  let requestCounter = 0;

  function getOrCreateState(key, now) {
    let state = stateByKey.get(key);
    if (!state) {
      state = {
        failures: [],
        blockedUntil: 0,
        penaltyLevel: 0,
        lastSeenAt: now,
      };
      stateByKey.set(key, state);
    }
    return state;
  }

  function pruneFailures(state, now) {
    const minAllowed = now - windowMs;
    state.failures = state.failures.filter((timestamp) => timestamp >= minAllowed);
  }

  function maybeCleanup(now) {
    requestCounter += 1;
    if (requestCounter % 100 !== 0) {
      return;
    }

    for (const [key, state] of stateByKey.entries()) {
      const idleFor = now - state.lastSeenAt;
      if (idleFor > staleAfterMs && state.blockedUntil < now) {
        stateByKey.delete(key);
      }
    }
  }

  return function failureRateLimiter(req, res, next) {
    const now = Date.now();
    maybeCleanup(now);

    const key = keyGenerator(req);
    if (!key) {
      return next();
    }

    const state = getOrCreateState(key, now);
    state.lastSeenAt = now;

    if (state.blockedUntil > now) {
      const retryAfterSeconds = Math.max(1, Math.ceil((state.blockedUntil - now) / 1000));
      res.setHeader('Retry-After', String(retryAfterSeconds));
      return next(new AppError(`Too many failed attempts. Try again in ${retryAfterSeconds} seconds`, 429));
    }

    res.once('finish', () => {
      const finishedAt = Date.now();
      state.lastSeenAt = finishedAt;

      if (res.statusCode >= 200 && res.statusCode < 300) {
        state.failures = [];
        state.penaltyLevel = 0;
        state.blockedUntil = 0;
        return;
      }

      if (!trackedStatusCodes.has(res.statusCode)) {
        return;
      }

      pruneFailures(state, finishedAt);
      state.failures.push(finishedAt);

      if (state.failures.length < maxFailures) {
        return;
      }

      const durationIndex = Math.min(state.penaltyLevel, durations.length - 1);
      const blockDuration = durations[durationIndex];
      state.blockedUntil = finishedAt + blockDuration;
      state.penaltyLevel = Math.min(state.penaltyLevel + 1, durations.length - 1);
      state.failures = [];
    });

    return next();
  };
}

/**
 * Limita o volume total de requisições por IP dentro de uma janela de tempo.
 * Protege o Prisma de esgotamento de pool causado por rajadas de F5 ou crawlers.
 *
 * @param {{ windowMs: number, maxRequests: number, blockDurationMs: number, keyGenerator?: Function }} options
 */
function createRequestRateLimiter(options) {
  const {
    windowMs,
    maxRequests,
    blockDurationMs,
    keyGenerator = (req) => req.ip,
  } = options;

  if (!Number.isInteger(windowMs) || windowMs < 1) {
    throw new Error('createRequestRateLimiter requires windowMs >= 1');
  }
  if (!Number.isInteger(maxRequests) || maxRequests < 1) {
    throw new Error('createRequestRateLimiter requires maxRequests >= 1');
  }
  if (!Number.isInteger(blockDurationMs) || blockDurationMs < 1) {
    throw new Error('createRequestRateLimiter requires blockDurationMs >= 1');
  }

  // { key → { hits: number[], blockedUntil: number, lastSeenAt: number } }
  const stateByKey = new Map();
  const staleAfterMs = Math.max(windowMs, blockDurationMs) * 3;
  let sweepCounter = 0;

  function maybeCleanup(now) {
    sweepCounter += 1;
    if (sweepCounter % 200 !== 0) return;
    for (const [key, state] of stateByKey.entries()) {
      if (now - state.lastSeenAt > staleAfterMs && state.blockedUntil < now) {
        stateByKey.delete(key);
      }
    }
  }

  return function requestRateLimiter(req, res, next) {
    const now = Date.now();
    maybeCleanup(now);

    const key = keyGenerator(req);
    if (!key) return next();

    let state = stateByKey.get(key);
    if (!state) {
      state = { hits: [], blockedUntil: 0, lastSeenAt: now };
      stateByKey.set(key, state);
    }
    state.lastSeenAt = now;

    if (state.blockedUntil > now) {
      const retryAfterSeconds = Math.max(1, Math.ceil((state.blockedUntil - now) / 1000));
      res.setHeader('Retry-After', String(retryAfterSeconds));
      return next(new AppError(`Too many requests. Try again in ${retryAfterSeconds} seconds`, 429));
    }

    // Remove hits fora da janela
    const cutoff = now - windowMs;
    state.hits = state.hits.filter((t) => t >= cutoff);
    state.hits.push(now);

    if (state.hits.length > maxRequests) {
      state.blockedUntil = now + blockDurationMs;
      state.hits = [];
      const retryAfterSeconds = Math.ceil(blockDurationMs / 1000);
      res.setHeader('Retry-After', String(retryAfterSeconds));
      return next(new AppError(`Too many requests. Try again in ${retryAfterSeconds} seconds`, 429));
    }

    return next();
  };
}

// Limiter pré-configurado para rotas públicas de leitura (GET sem autenticação).
// 120 req/min por IP — tolera navegação normal; bloqueia F5 automatizado.
const publicReadLimiter = createRequestRateLimiter({
  windowMs: 60_000,
  maxRequests: 120,
  blockDurationMs: 30_000,
});

module.exports = { createFailureRateLimiter, createRequestRateLimiter, publicReadLimiter };
