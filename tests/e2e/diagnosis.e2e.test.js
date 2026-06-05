'use strict';

/**
 * E2E — Diagnosis module
 *
 * Tests the full HTTP cycle for:
 *   GET    /api/diagnosis/forms               (list active forms, public)
 *   GET    /api/diagnosis/forms/:slug/questions (form questions, public)
 *   POST   /api/diagnosis/forms               (create form, requires MASTER/ADMIN)
 *   PATCH  /api/diagnosis/forms/:slug         (update form, requires MASTER/ADMIN)
 *   DELETE /api/diagnosis/forms/:slug         (delete form, requires MASTER/ADMIN)
 *   POST   /api/diagnosis                     (submit lead, public with rate-limit)
 *   GET    /api/diagnosis/leads               (list leads, requires MASTER/ADMIN)
 *   GET    /api/diagnosis/leads/:id           (single lead, requires MASTER/ADMIN)
 *   PATCH  /api/diagnosis/leads/:id/status    (update lead status, requires MASTER/ADMIN)
 */

const app = require('../../src/app');
const diagnosisService = require('../../src/modules/diagnosis/diagnosis.service');
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

// ── Public: list forms ────────────────────────────────────────────────────────

describe('GET /api/diagnosis/forms', () => {
  it('returns 200 with active forms for anonymous user', async () => {
    const mockForms = [
      { id: 'f-1', slug: 'commerce', title: 'Commerce Diagnosis', isActive: true },
      { id: 'f-2', slug: 'health', title: 'Health Diagnosis', isActive: true },
    ];
    vi.spyOn(diagnosisService, 'listForms').mockResolvedValue(mockForms);

    const res = await fetch(`${baseUrl}/api/diagnosis/forms`);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.status).toBe('success');
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.data).toHaveLength(2);
    // Anonymous callers always receive activeOnly=true
    expect(diagnosisService.listForms).toHaveBeenCalledWith(true);
  });
});

// ── Public: form questions ────────────────────────────────────────────────────

describe('GET /api/diagnosis/forms/:slug/questions', () => {
  it('returns 200 with form questions for a given slug', async () => {
    const mockForm = {
      id: 'f-1',
      slug: 'commerce',
      title: 'Commerce Diagnosis',
      description: 'For retail businesses',
      sections: [{ id: 's-1', title: 'Section 1', questions: [] }],
    };
    vi.spyOn(diagnosisService, 'getFormBySlug').mockResolvedValue(mockForm);

    const res = await fetch(`${baseUrl}/api/diagnosis/forms/commerce/questions`);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.slug).toBe('commerce');
    expect(Array.isArray(body.data.sections)).toBe(true);
    expect(diagnosisService.getFormBySlug).toHaveBeenCalledWith('commerce');
  });

  it('returns 404 when form slug does not exist', async () => {
    vi.spyOn(diagnosisService, 'getFormBySlug').mockRejectedValue(new AppError('Form not found', 404));

    const res = await fetch(`${baseUrl}/api/diagnosis/forms/unknown/questions`);

    expect(res.status).toBe(404);
  });
});

// ── Admin: create form ────────────────────────────────────────────────────────

describe('POST /api/diagnosis/forms', () => {
  const newForm = {
    slug: 'industry',
    title: 'Industry Diagnosis',
    description: 'For industrial companies',
    isActive: true,
    sections: [],
  };

  it('returns 201 and created form for MASTER', async () => {
    vi.spyOn(diagnosisService, 'createForm').mockResolvedValue({ id: 'f-3', ...newForm });

    const res = await fetch(`${baseUrl}/api/diagnosis/forms`, {
      method: 'POST',
      headers: authHeaders('MASTER'),
      body: JSON.stringify(newForm),
    });
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.status).toBe('success');
    expect(body.data.slug).toBe('industry');
  });

  it('returns 403 for EDITOR role', async () => {
    const res = await fetch(`${baseUrl}/api/diagnosis/forms`, {
      method: 'POST',
      headers: authHeaders('EDITOR'),
      body: JSON.stringify(newForm),
    });

    expect(res.status).toBe(403);
  });

  it('returns 401 without token', async () => {
    const res = await fetch(`${baseUrl}/api/diagnosis/forms`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: 'http://trusted.local' },
      body: JSON.stringify(newForm),
    });

    expect(res.status).toBe(401);
  });
});

// ── Admin: update form ────────────────────────────────────────────────────────

describe('PATCH /api/diagnosis/forms/:slug', () => {
  it('returns 200 with updated form for MASTER', async () => {
    const updated = { id: 'f-1', slug: 'commerce', title: 'Commerce v2', isActive: true, sections: [] };
    vi.spyOn(diagnosisService, 'updateForm').mockResolvedValue(updated);

    const res = await fetch(`${baseUrl}/api/diagnosis/forms/commerce`, {
      method: 'PATCH',
      headers: authHeaders('MASTER'),
      body: JSON.stringify({ title: 'Commerce v2' }),
    });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.title).toBe('Commerce v2');
    expect(diagnosisService.updateForm).toHaveBeenCalledWith('commerce', expect.objectContaining({ title: 'Commerce v2' }));
  });

  it('returns 403 for EDITOR role', async () => {
    const res = await fetch(`${baseUrl}/api/diagnosis/forms/commerce`, {
      method: 'PATCH',
      headers: authHeaders('EDITOR'),
      body: JSON.stringify({ title: 'Hack' }),
    });

    expect(res.status).toBe(403);
  });
});

// ── Admin: delete form ────────────────────────────────────────────────────────

describe('DELETE /api/diagnosis/forms/:slug', () => {
  it('returns 204 on successful delete for MASTER', async () => {
    vi.spyOn(diagnosisService, 'deleteForm').mockResolvedValue(undefined);

    const res = await fetch(`${baseUrl}/api/diagnosis/forms/industry`, {
      method: 'DELETE',
      headers: authHeaders('MASTER'),
    });

    expect(res.status).toBe(204);
    expect(diagnosisService.deleteForm).toHaveBeenCalledWith('industry');
  });

  it('returns 401 without token', async () => {
    const res = await fetch(`${baseUrl}/api/diagnosis/forms/industry`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json', Origin: 'http://trusted.local' },
    });

    expect(res.status).toBe(401);
  });
});

// ── Public: submit lead ───────────────────────────────────────────────────────

describe('POST /api/diagnosis', () => {
  const validLead = {
    formType: 'commerce',
    name: 'João Silva',
    companyName: 'Silva Comércio Ltda',
    phone: '(11) 99999-9999',
    email: 'joao@silva.com.br',
    city: 'São Paulo',
    state: 'SP',
    segment: 'varejo',
    operationSize: 'medium',
    marketTime: '5-10anos',
    mainChallenge: 'vendas',
    diagnosis: { section1: { q1: 'a', q2: 'b' } },
  };

  it('returns 201 and created lead on valid submission (public, no auth required)', async () => {
    vi.spyOn(diagnosisService, 'submitLead').mockResolvedValue({ id: 'lead-1', ...validLead, score: 75, leadTemperature: 'HOT', status: 'NEW' });

    const res = await fetch(`${baseUrl}/api/diagnosis`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: 'http://trusted.local' },
      body: JSON.stringify(validLead),
    });
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.status).toBe('success');
    expect(body.data.id).toBe('lead-1');
    expect(body.data.leadTemperature).toBe('HOT');
  });

  it('returns 400 on missing required fields', async () => {
    vi.spyOn(diagnosisService, 'submitLead').mockRejectedValue(new AppError("Field 'email' is required"));

    const res = await fetch(`${baseUrl}/api/diagnosis`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: 'http://trusted.local' },
      body: JSON.stringify({ formType: 'commerce', name: 'Test' }),
    });
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.status).toBe('error');
  });
});

// ── Admin: list leads ─────────────────────────────────────────────────────────

describe('GET /api/diagnosis/leads', () => {
  it('returns 200 with leads list for MASTER', async () => {
    const mockLeads = [
      { id: 'lead-1', formType: 'commerce', name: 'João', status: 'NEW', leadTemperature: 'HOT' },
      { id: 'lead-2', formType: 'health', name: 'Maria', status: 'CONTACTED', leadTemperature: 'WARM' },
    ];
    vi.spyOn(diagnosisService, 'listLeads').mockResolvedValue(mockLeads);

    const res = await fetch(`${baseUrl}/api/diagnosis/leads`, {
      headers: authHeaders('MASTER'),
    });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.status).toBe('success');
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.data).toHaveLength(2);
  });

  it('returns 403 for EDITOR role', async () => {
    const res = await fetch(`${baseUrl}/api/diagnosis/leads`, {
      headers: authHeaders('EDITOR'),
    });

    expect(res.status).toBe(403);
  });

  it('returns 401 without token', async () => {
    const res = await fetch(`${baseUrl}/api/diagnosis/leads`);

    expect(res.status).toBe(401);
  });
});

// ── Admin: get single lead ────────────────────────────────────────────────────

describe('GET /api/diagnosis/leads/:id', () => {
  it('returns 200 with full lead data for MASTER', async () => {
    const mockLead = { id: 'lead-1', formType: 'commerce', name: 'João', status: 'NEW', diagnosis: {} };
    vi.spyOn(diagnosisService, 'getLeadById').mockResolvedValue(mockLead);

    const res = await fetch(`${baseUrl}/api/diagnosis/leads/lead-1`, {
      headers: authHeaders('MASTER'),
    });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.id).toBe('lead-1');
    expect(diagnosisService.getLeadById).toHaveBeenCalledWith('lead-1');
  });

  it('returns 404 when lead does not exist', async () => {
    vi.spyOn(diagnosisService, 'getLeadById').mockRejectedValue(new AppError('Lead not found', 404));

    const res = await fetch(`${baseUrl}/api/diagnosis/leads/ghost`, {
      headers: authHeaders('MASTER'),
    });

    expect(res.status).toBe(404);
  });
});

// ── Admin: update lead status ─────────────────────────────────────────────────

describe('PATCH /api/diagnosis/leads/:id/status', () => {
  it('returns 200 with updated lead status for MASTER', async () => {
    const updated = { id: 'lead-1', status: 'CONTACTED', leadTemperature: 'HOT' };
    vi.spyOn(diagnosisService, 'updateLeadStatus').mockResolvedValue(updated);

    const res = await fetch(`${baseUrl}/api/diagnosis/leads/lead-1/status`, {
      method: 'PATCH',
      headers: authHeaders('MASTER'),
      body: JSON.stringify({ status: 'CONTACTED' }),
    });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.status).toBe('CONTACTED');
    expect(diagnosisService.updateLeadStatus).toHaveBeenCalledWith('lead-1', 'CONTACTED');
  });

  it('returns 403 for EDITOR role', async () => {
    const res = await fetch(`${baseUrl}/api/diagnosis/leads/lead-1/status`, {
      method: 'PATCH',
      headers: authHeaders('EDITOR'),
      body: JSON.stringify({ status: 'CONTACTED' }),
    });

    expect(res.status).toBe(403);
  });

  it('returns 401 without token', async () => {
    const res = await fetch(`${baseUrl}/api/diagnosis/leads/lead-1/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Origin: 'http://trusted.local' },
      body: JSON.stringify({ status: 'CONTACTED' }),
    });

    expect(res.status).toBe(401);
  });
});
