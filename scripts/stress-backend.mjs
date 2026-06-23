#!/usr/bin/env node
'use strict';

import {
  createWriteStream,
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from 'node:fs';
import { dirname, isAbsolute, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import http from 'node:http';
import https from 'node:https';
import { performance } from 'node:perf_hooks';

const __filename = fileURLToPath(import.meta.url);
const rootDir = process.cwd();
const rootDirName = dirname(__filename);

const runId = new Date().toISOString().replace(/[:.]/g, '-');
const configuredRunDir = process.env.STRESS_RUN_DIR || '';
const runDir = configuredRunDir
  ? (isAbsolute(configuredRunDir) ? configuredRunDir : join(rootDir, configuredRunDir))
  : join(rootDir, 'logs', `stress-${runId}`);
mkdirSync(runDir, { recursive: true });

const target = new URL(process.env.STRESS_TARGET || 'http://127.0.0.1:3000');
const stageDurationMs = Number(process.env.STRESS_STAGE_DURATION_MS || 20_000);
const requestTimeoutMs = Number(process.env.STRESS_REQUEST_TIMEOUT_MS || 5_000);
const maxStages = Number(process.env.STRESS_MAX_STAGES || 20);
const initialConcurrency = Number(process.env.STRESS_INITIAL_CONCURRENCY || 20);
const growthFactor = Number(process.env.STRESS_GROWTH_FACTOR || 2);
const maxConcurrency = Number(process.env.STRESS_MAX_CONCURRENCY || 2_560);
const failureMode = (process.env.STRESS_FAILURE_MODE || 'server_error').toLowerCase();

const appFile = join(rootDir, 'src', 'app.js');
if (!existsSync(appFile)) {
  throw new Error(`Could not find src/app.js at ${appFile}`);
}

const runnerEvents = createWriteStream(join(runDir, 'runner-events.log'), { flags: 'a' });
const summaryPath = join(runDir, 'runner-summary.json');
const csvPath = join(runDir, 'runner-summary.csv');

const requireRegex = /const\s+([A-Za-z_$][A-Za-z0-9_$]*)\s*=\s*require\(\s*(['"])([^'"]+)\2\s*\);/g;
const appUseRegex = /^\s*app\.use\(\s*(['"])([^'"]+)\1\s*,\s*([A-Za-z_$][A-Za-z0-9_$]*)\s*(?:,|\))/gm;
const appRouteRegex = /^\s*app\.(get|post|put|patch|delete|options|head)\s*\(\s*(['"])([^'"]+)\2/gi;
const routerRouteRegex = /router\.(get|post|put|patch|delete|options|head)\s*\(\s*(['"])([^'"`]+)\2/g;

const methodSupport = new Set(['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD']);
const paramDefaults = {
  id: '1',
  slug: 'sample-slug',
  uuid: '00000000-0000-0000-0000-000000000001',
  email: 'stress-test@example.com',
  token: 'sample-token',
  page: '1',
  name: 'sample',
  key: 'sample',
  type: 'sample',
};

function percent(arr, p) {
  if (!arr.length) return null;
  const sorted = [...arr].sort((a, b) => a - b);
  const idx = Math.floor((p / 100) * (sorted.length - 1));
  return sorted[idx];
}

function writeEvent(data) {
  runnerEvents.write(`${JSON.stringify(data)}\n`);
}

function toPathTemplate(path) {
  return path
    .split('/')
    .map((seg) => {
      if (!seg) return '';
      if (seg === '*') return 'wildcard';
      if (!seg.startsWith(':')) return seg;

      const inner = seg.replace(/^:/, '');
      const [name] = inner.split('(');
      const normalized = name.replace('?', '').toLowerCase();
      return paramDefaults[normalized] || 'sample';
    })
    .join('/');
}

function normalizeRoute(prefix, routePath) {
  if (!prefix || prefix === '/') {
    return routePath;
  }

  const cleanPrefix = prefix.endsWith('/') && prefix.length > 1 ? prefix.slice(0, -1) : prefix;
  if (routePath === '/') {
    return cleanPrefix;
  }
  if (routePath.startsWith('/')) {
    return `${cleanPrefix}${routePath}`;
  }
  return `${cleanPrefix}/${routePath}`;
}

function discoverRoutes() {
  const appSource = readFileSync(appFile, 'utf8');
  const requires = new Map();
  const mounts = [];
  const direct = [];
  const discovered = [];
  const seen = new Set();

  for (const match of appSource.matchAll(requireRegex)) {
    const [, variable, , modulePath] = match;
    if (!modulePath.startsWith('./')) {
      continue;
    }
    requires.set(variable, join(rootDir, 'src', modulePath.replace(/^\.\//, '')));
  }

  for (const match of appSource.matchAll(appUseRegex)) {
    const [, , prefix, variable] = match;
    const modulePath = requires.get(variable);
    if (!modulePath) continue;
    mounts.push({ prefix, modulePath: `${modulePath}.js` });
  }

  for (const match of appSource.matchAll(appRouteRegex)) {
    const [, method, , routePath] = match;
    const path = routePath.startsWith('/') ? routePath : `/${routePath}`;
    direct.push({ method: method.toUpperCase(), path });
  }

  for (const directRoute of direct) {
    const key = `${directRoute.method} ${directRoute.path}`;
    if (seen.has(key)) continue;
    seen.add(key);
    discovered.push(directRoute);
  }

  for (const mount of mounts) {
    if (!existsSync(mount.modulePath)) {
      continue;
    }
    const source = readFileSync(mount.modulePath, 'utf8');
    for (const match of source.matchAll(routerRouteRegex)) {
      const [, method, , routePath] = match;
      const path = normalizeRoute(mount.prefix, routePath.startsWith('/') ? routePath : `/${routePath}`);
      const finalPath = toPathTemplate(path);
      const key = `${method.toUpperCase()} ${finalPath}`;
      if (seen.has(key)) continue;
      seen.add(key);
      discovered.push({ method: method.toUpperCase(), path: finalPath });
    }
  }

  return discovered.filter((route) => methodSupport.has(route.method));
}

function buildRequestOptions(base, path, method) {
  return {
    protocol: base.protocol,
    hostname: base.hostname,
    port: base.port,
    path,
    method,
    headers: {
      Connection: 'keep-alive',
    },
  };
}

function isFailure(result) {
  if (result.error) return true;
  if (failureMode === 'any') return !result.ok;
  if (failureMode === 'non2xx') return result.status < 200 || result.status >= 300;
  return result.status >= 500;
}

function httpRequest({ method, path }) {
  const protocol = target.protocol === 'https:' ? https : http;
  const startedAt = performance.now();

  return new Promise((resolve) => {
    const options = buildRequestOptions(target, path, method);
    const req = protocol.request(options, (res) => {
      res.resume();
      res.on('end', () => {
        const latencyMs = Math.round(performance.now() - startedAt);
        resolve({
          ok: res.statusCode >= 200 && res.statusCode < 300,
          status: res.statusCode,
          latencyMs,
        });
      });
    });

    req.setTimeout(requestTimeoutMs, () => {
      req.destroy(new Error('ETIMEDOUT'));
    });

    if (method === 'POST' || method === 'PUT' || method === 'PATCH' || method === 'DELETE') {
      const body = JSON.stringify({});
      req.setHeader('Content-Type', 'application/json');
      req.setHeader('Content-Length', Buffer.byteLength(body));
      req.write(body);
    }

    req.on('error', (error) => {
      resolve({
        ok: false,
        error: error.code || error.message || 'REQUEST_ERROR',
        latencyMs: Math.round(performance.now() - startedAt),
      });
    });

    req.end();
  });
}

async function runStage(stageIndex, concurrency, scenarios, counters) {
  const state = {
    stageIndex,
    concurrency,
    startAt: Date.now(),
    total: 0,
    ok: 0,
    failed: 0,
    criticalFailures: 0,
    errors: 0,
    byPath: new Map(),
    firstFailure: null,
    latencies: [],
    minMs: Number.POSITIVE_INFINITY,
    maxMs: 0,
  };

  const stop = { aborted: false, reason: null };

  async function worker(workerId) {
    while (!stop.aborted) {
      if (Date.now() - state.startAt >= stageDurationMs) {
        break;
      }

      const seq = ++counters.sequence;
      const requestAt = new Date().toISOString();
      const scenario = scenarios[(seq - 1) % scenarios.length];
      const result = await httpRequest(scenario);

      counters.total += 1;
      state.total += 1;

      const metrics = {
        type: 'request',
        stageIndex,
        concurrency,
        workerId,
        sequence: seq,
        requestAt,
        method: scenario.method,
        path: scenario.path,
        latencyMs: result.latencyMs,
      };

      if (result.error) {
        state.failed += 1;
        state.errors += 1;
        metrics.result = 'failed';
        metrics.error = result.error;
        writeEvent(metrics);
      } else {
        state.ok += result.ok ? 1 : 0;
        if (!result.ok) {
          state.failed += 1;
        }
        state.latencies.push(result.latencyMs);
        state.minMs = Math.min(state.minMs, result.latencyMs);
        state.maxMs = Math.max(state.maxMs, result.latencyMs);
        metrics.result = result.ok ? 'ok' : 'failed';
        metrics.status = result.status;

        const pathStats = state.byPath.get(scenario.path) || { total: 0, failed: 0 };
        pathStats.total += 1;
        if (!result.ok) pathStats.failed += 1;
        state.byPath.set(scenario.path, pathStats);

        writeEvent(metrics);
      }

      if (isFailure(result) && !stop.aborted) {
        state.criticalFailures += 1;
        stop.aborted = true;
        stop.reason = {
          ...metrics,
          reason: result.error || `HTTP ${result.status}`,
        };
        state.firstFailure = stop.reason;
      }
    }
  }

  const workers = [];
  for (let i = 0; i < concurrency; i += 1) {
    workers.push(worker(i + 1));
  }
  await Promise.all(workers);

  const elapsedMs = Date.now() - state.startAt;
  const durationSec = Math.max(1, elapsedMs / 1000);
  return {
    summary: {
      stageIndex,
      concurrency,
      elapsedMs,
      requests: state.total,
      success: state.ok,
      failed: state.failed,
      errors: state.errors,
      rps: Number((state.total / durationSec).toFixed(2)),
      latencies: {
        minMs: Number.isFinite(state.minMs) ? state.minMs : null,
        maxMs: state.maxMs,
        p50Ms: percent(state.latencies, 50),
        p95Ms: percent(state.latencies, 95),
        p99Ms: percent(state.latencies, 99),
      },
      firstFailure: state.firstFailure,
      criticalFailures: state.criticalFailures,
      byPath: Object.fromEntries(state.byPath),
    },
    failed: state.criticalFailures > 0,
  };
}

function appendCsvHeader() {
  writeFileSync(
    csvPath,
    'stage,concurrency,requests,success,failed,errors,rps,minMs,p50Ms,p95Ms,p99Ms,maxMs,firstFailure\n',
  );
}

function appendCsvRow(summary) {
  const encodedFailure = summary.firstFailure ? JSON.stringify(summary.firstFailure).replaceAll('"', '""') : '';
  const row = [
    summary.stageIndex,
    summary.concurrency,
    summary.requests,
    summary.success,
    summary.failed,
    summary.errors,
    summary.rps,
    summary.latencies.minMs,
    summary.latencies.p50Ms,
    summary.latencies.p95Ms,
    summary.latencies.p99Ms,
    summary.latencies.maxMs,
    `"${encodedFailure}"`,
  ].join(',');
  writeFileSync(csvPath, `${row}\n`, { flag: 'a' });
}

function sortByRequestCount(a, b) {
  const countA = a.requests || 0;
  const countB = b.requests || 0;
  return countB - countA;
}

async function run() {
  const discoveredRoutes = discoverRoutes().sort((a, b) => {
    const methodCmp = a.method.localeCompare(b.method);
    if (methodCmp !== 0) return methodCmp;
    return sortByRequestCount(a, b);
  });
  if (!discoveredRoutes.length) {
    throw new Error('No discoverable routes found in app.js');
  }

  const preflight =
    discoveredRoutes.find((route) => route.method === 'GET' && route.path === '/api/health') ||
    discoveredRoutes.find((route) => route.method === 'GET') ||
    discoveredRoutes.find((route) => route.path === '/') ||
    discoveredRoutes[0];
  const counters = { sequence: 0, total: 0 };
  const stages = [];
  const cumulative = {
    startedAt: new Date().toISOString(),
  };

  let stopRun = false;
  let concurrency = initialConcurrency;
  let stageIndex = 1;
  let cumulativeOk = 0;
  let cumulativeFailed = 0;

  console.log(`STRESS RUN START ${runId}`);
  console.log(`Target: ${target.toString()}`);
  console.log(`Run dir: ${runDir}`);
  console.log(`Discovered routes: ${discoveredRoutes.length}`);
  for (const route of discoveredRoutes.slice(0, 10)) {
    console.log(`  ${route.method} ${route.path}`);
  }

  writeFileSync(
    summaryPath,
    JSON.stringify(
      {
        runId,
        target: target.toString(),
        discoveredRoutes,
        stageDurationMs,
        requestTimeoutMs,
        initialConcurrency,
        growthFactor,
        maxConcurrency,
        maxStages,
        failureMode,
        stages: [],
      },
      null,
      2,
    ),
  );
  appendCsvHeader();

  writeEvent({
    type: 'run-start',
    runId,
    target: target.toString(),
    failureMode,
    discoveredRoutes,
    startedAt: new Date().toISOString(),
  });

  const pre = await httpRequest(preflight);
  if (pre.error) {
    throw new Error(`Preflight failed: ${pre.error}`);
  }

  while (stageIndex <= maxStages && !stopRun && concurrency <= maxConcurrency) {
    const { summary, failed } = await runStage(stageIndex, concurrency, discoveredRoutes, counters);
    stages.push(summary);
    cumulativeOk += summary.success;
    cumulativeFailed += summary.failed;
    appendCsvRow(summary);
    writeFileSync(
      summaryPath,
      JSON.stringify(
        {
          runId,
          target: target.toString(),
          discoveredRoutes,
          stageDurationMs,
          requestTimeoutMs,
          initialConcurrency,
          growthFactor,
          maxConcurrency,
          maxStages,
          failureMode,
          stages,
        },
        null,
        2,
      ),
    );

    if (failed) {
      stopRun = true;
      break;
    }

    concurrency = Math.min(Math.ceil(concurrency * growthFactor), maxConcurrency);
    stageIndex += 1;
  }

  const runResult = {
    runId,
    runDir,
    target: target.toString(),
    stageDurationMs,
    requestTimeoutMs,
    finishedAt: new Date().toISOString(),
    completedStages: stages.length,
    totalRequestsSent: counters.total,
    totalSuccessfulRequests: cumulativeOk,
    totalFailedRequests: cumulativeFailed,
    stopReason: stopRun ? stages[stages.length - 1].firstFailure : null,
    canSupportConcurrency: stopRun && stages.length > 1 ? stages[stages.length - 2] : stages[stages.length - 1],
    discoveredRoutes,
    stages,
  };

  if (stages.length === 0) {
    console.log('No stages executed');
  } else if (stopRun) {
    console.log(`\nFailure detected on stage ${stages.at(-1).stageIndex} (concurrency ${stages.at(-1).concurrency}).`);
    console.log(`Total requests until failure: ${runResult.totalRequestsSent}`);
    const prev = stages.at(-2);
    if (prev) {
      console.log(`Last stable stage: concurrency ${prev.concurrency}, requests ${prev.requests}`);
    }
    console.log(`Failure reason: ${stages.at(-1).firstFailure?.reason || 'unknown'}`);
  } else {
    console.log('\nNo failures within configured limits');
  }

  writeEvent({
    type: 'run-end',
    runId,
    totalRequestsSent: runResult.totalRequestsSent,
    totalSuccessfulRequests: runResult.totalSuccessfulRequests,
    totalFailedRequests: runResult.totalFailedRequests,
    stopReason: runResult.stopReason,
  });
  writeFileSync(summaryPath, JSON.stringify(runResult, null, 2));
  runnerEvents.end();

  console.log(`\nRun summary JSON: ${summaryPath}`);
  console.log(`Run events: ${join(runDir, 'runner-events.log')}`);
  console.log(`Run CSV: ${csvPath}`);
  console.log(
    `Run complete. Total sent: ${runResult.totalRequestsSent} | Success: ${runResult.totalSuccessfulRequests} | Failed: ${runResult.totalFailedRequests}`,
  );
}

run().catch((error) => {
  writeEvent({
    type: 'run-error',
    runId,
    at: new Date().toISOString(),
    error: error.message || String(error),
  });
  runnerEvents.end();
  console.error(error);
  process.exitCode = 1;
});
