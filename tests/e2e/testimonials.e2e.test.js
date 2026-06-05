'use strict';

/**
 * E2E — Testimonials module
 *
 * Tests the full HTTP cycle for:
 *   GET    /api/testimonials              (page metadata)
 *   PUT    /api/testimonials              (upsert page, requires auth)
 *   GET    /api/testimonials/entries      (list all testimonials)
 *   POST   /api/testimonials/entries      (create, requires auth)
 *   GET    /api/testimonials/entries/:id  (single testimonial)
 *   PATCH  /api/testimonials/entries/:id  (update, requires auth)
 *   DELETE /api/testimonials/entries/:id  (delete, requires auth)
 */

const app = require('../../src/app');
const testimonialsService = require('../../src/modules/testimonials/testimonials.service');
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

// ── Testimonials page ─────────────────────────────────────────────────────────

describe('GET /api/testimonials', () => {
  it('returns 200 with page data', async () => {
    const mockPage = { id: 'test-page-1', title: 'What our clients say', subtitle: '', informative: [], cardFooter: {} };
    vi.spyOn(testimonialsService, 'get').mockResolvedValue(mockPage);

    const res = await fetch(`${baseUrl}/api/testimonials`);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.status).toBe('success');
    expect(body.data.title).toBe('What our clients say');
  });

  it('returns 404 when page is not configured', async () => {
    vi.spyOn(testimonialsService, 'get').mockRejectedValue(new AppError('Testimonials page not found', 404));

    const res = await fetch(`${baseUrl}/api/testimonials`);

    expect(res.status).toBe(404);
  });
});

describe('PUT /api/testimonials', () => {
  const validPayload = {
    title: 'What our clients say',
    subtitle: 'Real results',
    informative: [],
    cardFooter: { title: 'F', subtitle: 'FS' },
  };

  it('returns 200 when authenticated', async () => {
    vi.spyOn(testimonialsService, 'upsert').mockResolvedValue({ id: 'test-page-1', ...validPayload });

    const res = await fetch(`${baseUrl}/api/testimonials`, {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify(validPayload),
    });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.status).toBe('success');
  });

  it('returns 401 without token', async () => {
    const res = await fetch(`${baseUrl}/api/testimonials`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Origin: 'http://trusted.local' },
      body: JSON.stringify(validPayload),
    });

    expect(res.status).toBe(401);
  });
});

// ── Testimonial entries ───────────────────────────────────────────────────────

describe('GET /api/testimonials/entries', () => {
  it('returns 200 with list of testimonials', async () => {
    const mockList = [
      { id: 't-1', name: 'Alice', position: 'CEO', description: 'Great service', videoLink: 'https://youtube.com/v/1' },
      { id: 't-2', name: 'Bob', position: 'CFO', description: 'Amazing results', videoLink: 'https://youtube.com/v/2' },
    ];
    vi.spyOn(testimonialsService, 'list').mockResolvedValue(mockList);

    const res = await fetch(`${baseUrl}/api/testimonials/entries`);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.data).toHaveLength(2);
    expect(body.data[0].name).toBe('Alice');
  });
});

describe('POST /api/testimonials/entries', () => {
  const newEntry = {
    videoLink: 'https://youtube.com/watch?v=dQw4w9WgXcQ',
    description: 'Amazing service, highly recommend',
    name: 'Alice',
    position: 'CEO at TechCorp',
    clientSince: '2023',
  };

  it('returns 201 and created testimonial when authenticated', async () => {
    vi.spyOn(testimonialsService, 'create').mockResolvedValue({ id: 't-3', ...newEntry });

    const res = await fetch(`${baseUrl}/api/testimonials/entries`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(newEntry),
    });
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.status).toBe('success');
    expect(body.data.name).toBe('Alice');
  });

  it('returns 401 without token', async () => {
    const res = await fetch(`${baseUrl}/api/testimonials/entries`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: 'http://trusted.local' },
      body: JSON.stringify(newEntry),
    });

    expect(res.status).toBe(401);
  });
});

describe('GET /api/testimonials/entries/:id', () => {
  it('returns 200 with the requested testimonial', async () => {
    const mockEntry = { id: 't-1', name: 'Alice', position: 'CEO', description: 'Great', videoLink: 'https://youtube.com/v/1' };
    vi.spyOn(testimonialsService, 'getOne').mockResolvedValue(mockEntry);

    const res = await fetch(`${baseUrl}/api/testimonials/entries/t-1`);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.id).toBe('t-1');
    expect(testimonialsService.getOne).toHaveBeenCalledWith('t-1');
  });

  it('returns 404 when testimonial does not exist', async () => {
    vi.spyOn(testimonialsService, 'getOne').mockRejectedValue(new AppError('Testimonial not found', 404));

    const res = await fetch(`${baseUrl}/api/testimonials/entries/ghost`);

    expect(res.status).toBe(404);
  });
});

describe('PATCH /api/testimonials/entries/:id', () => {
  it('returns 200 with updated testimonial when authenticated', async () => {
    const updated = { id: 't-1', name: 'Alice Updated', position: 'CEO', description: 'Great', videoLink: 'https://youtube.com/v/1' };
    vi.spyOn(testimonialsService, 'update').mockResolvedValue(updated);

    const res = await fetch(`${baseUrl}/api/testimonials/entries/t-1`, {
      method: 'PATCH',
      headers: authHeaders(),
      body: JSON.stringify({ name: 'Alice Updated' }),
    });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.name).toBe('Alice Updated');
  });

  it('returns 401 without token', async () => {
    const res = await fetch(`${baseUrl}/api/testimonials/entries/t-1`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Origin: 'http://trusted.local' },
      body: JSON.stringify({ name: 'Updated' }),
    });

    expect(res.status).toBe(401);
  });
});

describe('DELETE /api/testimonials/entries/:id', () => {
  it('returns 204 on successful delete when authenticated', async () => {
    vi.spyOn(testimonialsService, 'remove').mockResolvedValue(undefined);

    const res = await fetch(`${baseUrl}/api/testimonials/entries/t-1`, {
      method: 'DELETE',
      headers: authHeaders(),
    });

    expect(res.status).toBe(204);
    expect(testimonialsService.remove).toHaveBeenCalledWith('t-1');
  });

  it('returns 401 without token', async () => {
    const res = await fetch(`${baseUrl}/api/testimonials/entries/t-1`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json', Origin: 'http://trusted.local' },
    });

    expect(res.status).toBe(401);
  });

  it('returns 404 when testimonial does not exist', async () => {
    vi.spyOn(testimonialsService, 'remove').mockRejectedValue(new AppError('Testimonial not found', 404));

    const res = await fetch(`${baseUrl}/api/testimonials/entries/ghost`, {
      method: 'DELETE',
      headers: authHeaders(),
    });
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body.status).toBe('error');
  });
});
