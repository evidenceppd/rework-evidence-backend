'use strict';

/**
 * E2E — Clients module
 *
 * Tests the full HTTP cycle for:
 *   GET    /api/clients                    (page metadata)
 *   PUT    /api/clients                    (upsert page, requires auth)
 *   GET    /api/clients/companies          (list companies)
 *   POST   /api/clients/companies          (create company, requires auth)
 *   GET    /api/clients/companies/:id      (single company)
 *   PUT    /api/clients/companies/:id      (update company, requires auth)
 *   DELETE /api/clients/companies/:id      (delete company, requires auth)
 */

const app = require('../../src/app');
const clientsService = require('../../src/modules/clients/clients.service');
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

// ── Clients page ──────────────────────────────────────────────────────────────

describe('GET /api/clients', () => {
  it('returns 200 with clients page data', async () => {
    const mockPage = { id: 'clients-1', title: 'Our clients', subtitle: 'Trusted by', cardsClients: [], cardFooter: {} };
    vi.spyOn(clientsService, 'getPage').mockResolvedValue(mockPage);

    const res = await fetch(`${baseUrl}/api/clients`);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.status).toBe('success');
    expect(body.data.title).toBe('Our clients');
  });

  it('returns 404 when page is not configured', async () => {
    vi.spyOn(clientsService, 'getPage').mockRejectedValue(new AppError('Clients page not found', 404));

    const res = await fetch(`${baseUrl}/api/clients`);

    expect(res.status).toBe(404);
  });
});

describe('PUT /api/clients', () => {
  const validPayload = {
    title: 'Our clients',
    subtitle: 'Trusted by the best',
    cardsClients: [{ icon: 'star', context: 'Quality', explanation: 'Top tier' }],
    cardFooter: { title: 'Contact us', subtitle: 'Today' },
  };

  it('returns 200 when authenticated', async () => {
    vi.spyOn(clientsService, 'upsertPage').mockResolvedValue({ id: 'clients-1', ...validPayload });

    const res = await fetch(`${baseUrl}/api/clients`, {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify(validPayload),
    });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.status).toBe('success');
    expect(clientsService.upsertPage).toHaveBeenCalledOnce();
  });

  it('returns 401 without token', async () => {
    const res = await fetch(`${baseUrl}/api/clients`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Origin: 'http://trusted.local' },
      body: JSON.stringify(validPayload),
    });

    expect(res.status).toBe(401);
  });
});

// ── Companies ─────────────────────────────────────────────────────────────────

describe('GET /api/clients/companies', () => {
  it('returns 200 with list of companies', async () => {
    const mockCompanies = [
      { id: 'c-1', segment: 'tech', clientImage: 'https://cdn.example.com/logo1.png', clientDescription: 'TechCorp', clientSince: '2022-01-01' },
      { id: 'c-2', segment: 'retail', clientImage: 'https://cdn.example.com/logo2.png', clientDescription: 'RetailCo', clientSince: '2023-06-15' },
    ];
    vi.spyOn(clientsService, 'listCompanies').mockResolvedValue(mockCompanies);

    const res = await fetch(`${baseUrl}/api/clients/companies`);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.data).toHaveLength(2);
    expect(body.data[0].segment).toBe('tech');
  });
});

describe('POST /api/clients/companies', () => {
  const newCompany = {
    segment: 'finance',
    clientImage: 'https://cdn.example.com/logos/bank.png',
    clientDescription: 'Leading bank in Brazil',
    clientSince: '2024-03-01',
  };

  it('returns 201 and created company when authenticated', async () => {
    vi.spyOn(clientsService, 'createCompany').mockResolvedValue({ id: 'c-3', ...newCompany });

    const res = await fetch(`${baseUrl}/api/clients/companies`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(newCompany),
    });
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.status).toBe('success');
    expect(body.data.segment).toBe('finance');
    expect(body.data.id).toBe('c-3');
  });

  it('returns 401 without token', async () => {
    const res = await fetch(`${baseUrl}/api/clients/companies`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: 'http://trusted.local' },
      body: JSON.stringify(newCompany),
    });

    expect(res.status).toBe(401);
  });

  it('returns 400 on missing required fields', async () => {
    vi.spyOn(clientsService, 'createCompany').mockRejectedValue(new AppError("Field 'segment' is required"));

    const res = await fetch(`${baseUrl}/api/clients/companies`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ clientDescription: 'missing required fields' }),
    });
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.status).toBe('error');
  });
});

describe('GET /api/clients/companies/:id', () => {
  it('returns 200 with the requested company', async () => {
    const mockCompany = { id: 'c-1', segment: 'tech', clientImage: 'https://cdn.example.com/logo.png', clientDescription: 'TechCorp', clientSince: '2022-01-01' };
    vi.spyOn(clientsService, 'getCompany').mockResolvedValue(mockCompany);

    const res = await fetch(`${baseUrl}/api/clients/companies/c-1`);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.id).toBe('c-1');
    expect(clientsService.getCompany).toHaveBeenCalledWith('c-1');
  });

  it('returns 404 when company does not exist', async () => {
    vi.spyOn(clientsService, 'getCompany').mockRejectedValue(new AppError('Company not found', 404));

    const res = await fetch(`${baseUrl}/api/clients/companies/ghost`);

    expect(res.status).toBe(404);
  });
});

describe('PUT /api/clients/companies/:id', () => {
  it('returns 200 with updated company when authenticated', async () => {
    const updated = { id: 'c-1', segment: 'fintech', clientImage: 'https://cdn.example.com/logo.png', clientDescription: 'Updated Desc', clientSince: '2022-01-01' };
    vi.spyOn(clientsService, 'updateCompany').mockResolvedValue(updated);

    const res = await fetch(`${baseUrl}/api/clients/companies/c-1`, {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify({ segment: 'fintech', clientDescription: 'Updated Desc' }),
    });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.segment).toBe('fintech');
  });

  it('returns 401 without token', async () => {
    const res = await fetch(`${baseUrl}/api/clients/companies/c-1`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Origin: 'http://trusted.local' },
      body: JSON.stringify({ segment: 'fintech' }),
    });

    expect(res.status).toBe(401);
  });
});

describe('DELETE /api/clients/companies/:id', () => {
  it('returns 204 on successful delete when authenticated', async () => {
    vi.spyOn(clientsService, 'deleteCompany').mockResolvedValue(undefined);

    const res = await fetch(`${baseUrl}/api/clients/companies/c-1`, {
      method: 'DELETE',
      headers: authHeaders(),
    });

    expect(res.status).toBe(204);
    expect(clientsService.deleteCompany).toHaveBeenCalledWith('c-1');
  });

  it('returns 401 without token', async () => {
    const res = await fetch(`${baseUrl}/api/clients/companies/c-1`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json', Origin: 'http://trusted.local' },
    });

    expect(res.status).toBe(401);
  });

  it('returns 404 when company does not exist', async () => {
    vi.spyOn(clientsService, 'deleteCompany').mockRejectedValue(new AppError('Company not found', 404));

    const res = await fetch(`${baseUrl}/api/clients/companies/ghost`, {
      method: 'DELETE',
      headers: authHeaders(),
    });
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body.status).toBe('error');
  });
});
