'use strict';

const { readEvents, writeEvents } = require('./analytics.store');

const DAY_MS = 24 * 60 * 60 * 1000;

const GENERIC_PAGE_TITLES = new Set(['site', 'p\u00e1gina p\u00fablica', 'pagina publica', '']);
const PUBLIC_PAGE_TITLES = new Map([
  ['/', 'P\u00e1gina inicial'],
  ['/como-trabalhamos', 'Como trabalhamos'],
  ['/servicos', 'Servi\u00e7os'],
  ['/clientes', 'Clientes'],
  ['/blog', 'Blog'],
  ['/depoimentos', 'Depoimentos'],
  ['/analise', 'An\u00e1lise'],
]);

function cleanTitle(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function isGenericTitle(value) {
  return GENERIC_PAGE_TITLES.has(cleanTitle(value).toLowerCase());
}

function titleFromPage(page) {
  const pathname = normalizePage(page).split('?')[0] || '/';
  if (pathname.startsWith('/blog/')) return 'Post do blog';
  return PUBLIC_PAGE_TITLES.get(pathname) || null;
}

function bestPageTitle(page, currentTitle, nextTitle) {
  const next = cleanTitle(nextTitle);
  if (next && !isGenericTitle(next)) return next;

  const current = cleanTitle(currentTitle);
  if (current && !isGenericTitle(current)) return current;

  return titleFromPage(page) || current || next || null;
}


function startOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function toDateKey(date) {
  return date.toISOString().slice(0, 10);
}

function sameMonth(date, now = new Date()) {
  return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
}

function normalizePage(value) {
  if (!value || typeof value !== 'string') return '/';
  const trimmed = value.trim();
  if (!trimmed) return '/';

  try {
    const parsed = new URL(trimmed, 'http://local.invalid');
    return `${parsed.pathname || '/'}${parsed.search || ''}`;
  } catch {
    return trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  }
}

function detectDevice(userAgent = '') {
  const ua = userAgent.toLowerCase();
  if (/ipad|tablet/.test(ua)) return 'tablet';
  if (/mobi|android|iphone|phone/.test(ua)) return 'mobile';
  return 'desktop';
}

async function track(payload = {}, req = {}) {
  const events = await readEvents();
  const page = normalizePage(payload.page || req.headers?.['x-page-path'] || req.originalUrl);
  const sessionId = typeof payload.sessionId === 'string' ? payload.sessionId.slice(0, 120) : null;
  const now = new Date();

  const event = {
    id: `${now.getTime()}-${Math.random().toString(36).slice(2, 10)}`,
    page,
    title: typeof payload.title === 'string' ? payload.title.slice(0, 180) : null,
    referrer: typeof payload.referrer === 'string' ? payload.referrer.slice(0, 500) : null,
    sessionId,
    device: detectDevice(req.headers?.['user-agent']),
    ip: req.ip || req.socket?.remoteAddress || null,
    createdAt: now.toISOString(),
  };

  events.push(event);
  await writeEvents(events);
  return { id: event.id, counted: true };
}

async function listEvents() {
  const events = await readEvents();
  return events
    .map((event) => ({ ...event, createdAtDate: new Date(event.createdAt) }))
    .filter((event) => !Number.isNaN(event.createdAtDate.getTime()));
}

async function viewsMonth() {
  const events = await listEvents();
  const now = new Date();
  return { count: events.filter((event) => sameMonth(event.createdAtDate, now)).length, month: now.getMonth() + 1 };
}

async function devicesMonth() {
  const events = await listEvents();
  const counts = new Map();

  for (const event of events.filter((item) => sameMonth(item.createdAtDate))) {
    const device = event.device || 'desktop';
    counts.set(device, (counts.get(device) || 0) + 1);
  }

  return Array.from(counts, ([device, count]) => ({ device, count })).sort((a, b) => b.count - a.count);
}

async function dailyAverage() {
  const events = await listEvents();
  const since = startOfDay(new Date(Date.now() - 29 * DAY_MS));
  const count = events.filter((event) => event.createdAtDate >= since).length;
  return { total: count, average: Number((count / 30).toFixed(2)), period: 'last_30_days' };
}

async function last7Days() {
  const events = await listEvents();
  const today = startOfDay(new Date());
  const buckets = new Map();

  for (let i = 6; i >= 0; i -= 1) {
    const day = new Date(today.getTime() - i * DAY_MS);
    buckets.set(toDateKey(day), 0);
  }

  for (const event of events) {
    const key = toDateKey(event.createdAtDate);
    if (buckets.has(key)) buckets.set(key, buckets.get(key) + 1);
  }

  return Array.from(buckets, ([date, count]) => ({ date, count }));
}

async function topPages(limit = 10) {
  const events = await listEvents();
  const counts = new Map();

  for (const event of events) {
    const current = counts.get(event.page) || { page: event.page, title: null, views: 0 };
    current.views += 1;
    current.title = bestPageTitle(event.page, current.title, event.title);
    counts.set(event.page, current);
  }

  return Array.from(counts.values())
    .sort((a, b) => b.views - a.views)
    .slice(0, limit);
}

async function stats() {
  const [month, devices, average, days, pages] = await Promise.all([
    viewsMonth(),
    devicesMonth(),
    dailyAverage(),
    last7Days(),
    topPages(5),
  ]);
  const events = await listEvents();

  return {
    totalViews: events.length,
    viewsThisMonth: month.count,
    devices,
    dailyAverage: average,
    last7Days: days,
    topPages: pages,
    generatedAt: new Date().toISOString(),
  };
}

async function cleanup(days = 90) {
  const safeDays = Number.isFinite(Number(days)) && Number(days) > 0 ? Number(days) : 90;
  const cutoff = new Date(Date.now() - safeDays * DAY_MS);
  const events = await readEvents();
  const kept = events.filter((event) => {
    const createdAt = new Date(event.createdAt);
    return Number.isNaN(createdAt.getTime()) || createdAt >= cutoff;
  });

  await writeEvents(kept);
  return {
    message: 'Dados antigos removidos com sucesso.',
    deletedCount: events.length - kept.length,
    olderThan: cutoff.toISOString(),
  };
}

module.exports = { track, stats, viewsMonth, devicesMonth, dailyAverage, last7Days, topPages, cleanup };
