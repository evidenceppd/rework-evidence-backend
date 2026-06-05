'use strict';

/**
 * E2E — Services module
 *
 * Tests the full HTTP cycle for:
 *   GET    /api/services             (page metadata)
 *   PUT    /api/services             (upsert page, requires auth)
 *   GET    /api/services/cards       (list service cards)
 *   POST   /api/services/cards       (create card, requires auth)
 *   GET    /api/services/cards/:id   (single card)
 *   PUT    /api/services/cards/:id   (update card, requires auth)
 *   DELETE /api/services/cards/:id   (delete card, requires auth)
 */

const app = require('../../src/app');
const servicesService = require('../../src/modules/services/services.service');
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

// ── Services page ─────────────────────────────────────────────────────────────

describe('GET /api/services', () => {
  it('returns 200 with services page data', async () => {
    const mockPage = {
      id: 'svc-page-1',
      title: 'Our Services',
      subtitle: 'We deliver',
      explanation: 'How we work',
      businessAccelerator: {},
      results: [],
      cardFooter: {},
    };
    vi.spyOn(servicesService, 'getPage').mockResolvedValue(mockPage);

    const res = await fetch(`${baseUrl}/api/services`);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.status).toBe('success');
    expect(body.data.title).toBe('Our Services');
  });

  it('returns 404 when page is not configured', async () => {
    vi.spyOn(servicesService, 'getPage').mockRejectedValue(new AppError('Services page not found', 404));

    const res = await fetch(`${baseUrl}/api/services`);

    expect(res.status).toBe(404);
  });
});

describe('PUT /api/services', () => {
  const validPayload = {
    title: 'Our Services',
    subtitle: 'We deliver',
    explanation: 'Full cycle consulting',
    businessAccelerator: { title: 'Accelerate', subtitle: 'Fast', implementation_plan: [] },
    results: [{ icon: 'chart', title: 'ROI', explanation: 'Fast return' }],
    cardFooter: { title: 'Start now', subtitle: 'Free consultation' },
  };

  it('returns 200 when authenticated', async () => {
    vi.spyOn(servicesService, 'upsertPage').mockResolvedValue({ id: 'svc-page-1', ...validPayload });

    const res = await fetch(`${baseUrl}/api/services`, {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify(validPayload),
    });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.status).toBe('success');
  });

  it('returns 401 without token', async () => {
    const res = await fetch(`${baseUrl}/api/services`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Origin: 'http://trusted.local' },
      body: JSON.stringify(validPayload),
    });

    expect(res.status).toBe(401);
  });
});

// ── Service cards ─────────────────────────────────────────────────────────────

describe('GET /api/services/cards', () => {
  it('returns 200 with list of service cards', async () => {
    const mockCards = [
      { id: 'sc-1', cardIcon: 'star', title: 'Consulting', description: 'Expert consulting', topics: ['Strategy', 'Execution'] },
      { id: 'sc-2', cardIcon: 'chart', title: 'Analytics', description: 'Data driven', topics: ['KPIs', 'Dashboard'] },
    ];
    vi.spyOn(servicesService, 'listCards').mockResolvedValue(mockCards);

    const res = await fetch(`${baseUrl}/api/services/cards`);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.data).toHaveLength(2);
    expect(body.data[0].title).toBe('Consulting');
  });
});

describe('POST /api/services/cards', () => {
  const newCard = {
    cardIcon: 'rocket',
    title: 'Growth Strategy',
    description: 'Accelerate your growth',
    topics: ['Market Expansion', 'Revenue Optimization', 'Customer Acquisition'],
  };

  it('returns 201 and created card when authenticated', async () => {
    vi.spyOn(servicesService, 'createCard').mockResolvedValue({ id: 'sc-3', ...newCard });

    const res = await fetch(`${baseUrl}/api/services/cards`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(newCard),
    });
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.status).toBe('success');
    expect(body.data.title).toBe('Growth Strategy');
    expect(body.data.id).toBe('sc-3');
  });

  it('returns 401 without token', async () => {
    const res = await fetch(`${baseUrl}/api/services/cards`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: 'http://trusted.local' },
      body: JSON.stringify(newCard),
    });

    expect(res.status).toBe(401);
  });
});

describe('GET /api/services/cards/:id', () => {
  it('returns 200 with the requested card', async () => {
    const mockCard = { id: 'sc-1', cardIcon: 'star', title: 'Consulting', description: 'Expert consulting', topics: [] };
    vi.spyOn(servicesService, 'getCard').mockResolvedValue(mockCard);

    const res = await fetch(`${baseUrl}/api/services/cards/sc-1`);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.id).toBe('sc-1');
    expect(servicesService.getCard).toHaveBeenCalledWith('sc-1');
  });

  it('returns 404 when card does not exist', async () => {
    vi.spyOn(servicesService, 'getCard').mockRejectedValue(new AppError('Service card not found', 404));

    const res = await fetch(`${baseUrl}/api/services/cards/ghost`);

    expect(res.status).toBe(404);
  });
});

describe('PUT /api/services/cards/:id', () => {
  it('returns 200 with updated card when authenticated', async () => {
    const updated = { id: 'sc-1', cardIcon: 'star', title: 'Advanced Consulting', description: 'Expert consulting', topics: [] };
    vi.spyOn(servicesService, 'updateCard').mockResolvedValue(updated);

    const res = await fetch(`${baseUrl}/api/services/cards/sc-1`, {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify({ title: 'Advanced Consulting' }),
    });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.title).toBe('Advanced Consulting');
    expect(servicesService.updateCard).toHaveBeenCalledWith('sc-1', expect.objectContaining({ title: 'Advanced Consulting' }));
  });

  it('returns 401 without token', async () => {
    const res = await fetch(`${baseUrl}/api/services/cards/sc-1`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Origin: 'http://trusted.local' },
      body: JSON.stringify({ title: 'Hacked' }),
    });

    expect(res.status).toBe(401);
  });
});

describe('DELETE /api/services/cards/:id', () => {
  it('returns 204 on successful delete when authenticated', async () => {
    vi.spyOn(servicesService, 'deleteCard').mockResolvedValue(undefined);

    const res = await fetch(`${baseUrl}/api/services/cards/sc-1`, {
      method: 'DELETE',
      headers: authHeaders(),
    });

    expect(res.status).toBe(204);
    expect(servicesService.deleteCard).toHaveBeenCalledWith('sc-1');
  });

  it('returns 401 without token', async () => {
    const res = await fetch(`${baseUrl}/api/services/cards/sc-1`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json', Origin: 'http://trusted.local' },
    });

    expect(res.status).toBe(401);
  });

  it('returns 404 when card does not exist', async () => {
    vi.spyOn(servicesService, 'deleteCard').mockRejectedValue(new AppError('Service card not found', 404));

    const res = await fetch(`${baseUrl}/api/services/cards/ghost`, {
      method: 'DELETE',
      headers: authHeaders(),
    });
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body.status).toBe('error');
  });
});
