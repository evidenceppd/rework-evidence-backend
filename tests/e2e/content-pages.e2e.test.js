'use strict';

/**
 * E2E — Content Pages (singleton resources)
 *
 * Tests the full HTTP cycle for:
 *   GET  /api/home          PUT  /api/home
 *   GET  /api/how-we-work   PUT  /api/how-we-work
 *   GET  /api/config        PUT  /api/config
 *
 * Services are mocked via vi.spyOn to avoid DB calls while keeping
 * all Express middleware (CORS, CSRF, requireAuth, sanitize) active.
 */

const app = require('../../src/app');
const homeService = require('../../src/modules/home/home.service');
const howWeWorkService = require('../../src/modules/how-we-work/how-we-work.service');
const configService = require('../../src/modules/config/config.service');
const { authHeaders, bypassTokenRevocation } = require('./helpers');

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

// ── /api/home ─────────────────────────────────────────────────────────────────

describe('GET /api/home', () => {
  it('returns 200 with home page data', async () => {
    const mockPage = { id: 'home-1', bannerHome: { title: 'Welcome' }, scenario: {}, bottlenecks: [], performance: {}, howWeWork: [], blogSectionTitle: 'Blog', cardFooter: {} };
    vi.spyOn(homeService, 'get').mockResolvedValue(mockPage);

    const res = await fetch(`${baseUrl}/api/home`);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.status).toBe('success');
    expect(body.data.id).toBe('home-1');
  });

  it('returns 404 when home page does not exist', async () => {
    const { AppError } = require('../../src/utils/errors');
    vi.spyOn(homeService, 'get').mockRejectedValue(new AppError('Home page not found', 404));

    const res = await fetch(`${baseUrl}/api/home`);
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body.status).toBe('error');
  });
});

describe('PUT /api/home', () => {
  const validPayload = {
    bannerHome: { title: 'T', subtitle: 'S', banner_image: 'https://cdn.example.com/img.jpg', explanation: [] },
    scenario: { title: 'S', explanation: [] },
    bottlenecks: [],
    performance: { title: 'P', explanation: [] },
    howWeWork: [],
    blogSectionTitle: 'Blog',
    cardFooter: { title: 'F', subtitle: 'FS' },
  };

  it('returns 200 and updated home data when authenticated', async () => {
    vi.spyOn(homeService, 'upsert').mockResolvedValue({ id: 'home-1', ...validPayload });

    const res = await fetch(`${baseUrl}/api/home`, {
      method: 'PUT',
      headers: authHeaders('MASTER'),
      body: JSON.stringify(validPayload),
    });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.status).toBe('success');
    expect(homeService.upsert).toHaveBeenCalledOnce();
  });

  it('returns 401 without Authorization header', async () => {
    const res = await fetch(`${baseUrl}/api/home`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Origin: 'http://trusted.local' },
      body: JSON.stringify(validPayload),
    });

    expect(res.status).toBe(401);
  });

  it('returns 403 from untrusted origin even with valid token', async () => {
    const res = await fetch(`${baseUrl}/api/home`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Origin: 'http://evil.local',
        Authorization: `Bearer ${require('./helpers').makeAccessToken()}`,
      },
      body: JSON.stringify(validPayload),
    });

    expect(res.status).toBe(403);
  });
});

// ── /api/how-we-work ─────────────────────────────────────────────────────────

describe('GET /api/how-we-work', () => {
  it('returns 200 with how-we-work page data', async () => {
    const mockPage = { id: 'hww-1', aboutUs: {}, howWeWork: {}, oursValues: {}, cardFooter: {} };
    vi.spyOn(howWeWorkService, 'get').mockResolvedValue(mockPage);

    const res = await fetch(`${baseUrl}/api/how-we-work`);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.status).toBe('success');
    expect(body.data.id).toBe('hww-1');
  });

  it('returns 404 when page does not exist', async () => {
    const { AppError } = require('../../src/utils/errors');
    vi.spyOn(howWeWorkService, 'get').mockRejectedValue(new AppError('How we work page not found', 404));

    const res = await fetch(`${baseUrl}/api/how-we-work`);
    const body = await res.json();

    expect(res.status).toBe(404);
  });
});

describe('PUT /api/how-we-work', () => {
  const validPayload = {
    aboutUs: { title: 'A', image: 'https://cdn.example.com/a.jpg', objectives: [], card_image: [] },
    howWeWork: { title: 'H', processes: [] },
    oursValues: { title: 'V' },
    cardFooter: { title: 'F', subtitle: 'FS' },
  };

  it('returns 200 when authenticated and valid payload', async () => {
    vi.spyOn(howWeWorkService, 'upsert').mockResolvedValue({ id: 'hww-1', ...validPayload });

    const res = await fetch(`${baseUrl}/api/how-we-work`, {
      method: 'PUT',
      headers: authHeaders('MASTER'),
      body: JSON.stringify(validPayload),
    });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.status).toBe('success');
  });

  it('returns 401 without token', async () => {
    const res = await fetch(`${baseUrl}/api/how-we-work`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Origin: 'http://trusted.local' },
      body: JSON.stringify(validPayload),
    });

    expect(res.status).toBe(401);
  });
});

// ── /api/config ───────────────────────────────────────────────────────────────

describe('GET /api/config', () => {
  it('returns 200 with site config data', async () => {
    const mockConfig = { id: 'cfg-1', cnpj: '00.000.000/0001-00', socialMedia: {}, contactUs: {} };
    vi.spyOn(configService, 'get').mockResolvedValue(mockConfig);

    const res = await fetch(`${baseUrl}/api/config`);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.status).toBe('success');
    expect(body.data.cnpj).toBe('00.000.000/0001-00');
  });
});

describe('PUT /api/config', () => {
  const validPayload = {
    description: 'Agency description',
    cnpj: '00.000.000/0001-00',
    socialMedia: { instagram: 'https://instagram.com/agency' },
    contactUs: { telefone: '(11) 99999-9999', email: 'contact@agency.com', location: 'São Paulo, SP' },
  };

  it('returns 200 and upserted config when authenticated', async () => {
    vi.spyOn(configService, 'upsert').mockResolvedValue({ id: 'cfg-1', ...validPayload });

    const res = await fetch(`${baseUrl}/api/config`, {
      method: 'PUT',
      headers: authHeaders('MASTER'),
      body: JSON.stringify(validPayload),
    });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.status).toBe('success');
    expect(configService.upsert).toHaveBeenCalledOnce();
  });

  it('returns 401 without token', async () => {
    const res = await fetch(`${baseUrl}/api/config`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Origin: 'http://trusted.local' },
      body: JSON.stringify(validPayload),
    });

    expect(res.status).toBe(401);
  });
});
