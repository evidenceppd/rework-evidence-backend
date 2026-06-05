'use strict';

const service = require('../../src/modules/diagnosis/diagnosis.service');
const repo = require('../../src/modules/diagnosis/diagnosis.repository');
const formRepo = require('../../src/modules/diagnosis/diagnosis.form.repository');

// Formulário padrão retornado pelo formRepo em todos os testes de lead
const MOCK_FORM = { id: 'form-commerce', slug: 'commerce', title: 'Commerce', isActive: true };

afterEach(() => {
  vi.restoreAllMocks();
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeValidLead(overrides = {}) {
  return {
    formType: 'commerce',
    name: 'John Doe',
    companyName: 'Acme Corp',
    phone: '11999999999',
    email: 'john@example.com',
    city: 'São Paulo',
    state: 'SP',
    diagnosis: {},
    ...overrides,
  };
}

function mockForm(form = MOCK_FORM) {
  return vi.spyOn(formRepo, 'findBySlug').mockResolvedValue(form);
}

// ─── submitLead — validações comuns ──────────────────────────────────────────

describe('diagnosis service — submitLead validation', () => {
  it('cria um lead com dados válidos', async () => {
    mockForm();
    const createSpy = vi.spyOn(repo, 'create').mockResolvedValue({ id: 'lead-1' });

    await service.submitLead(makeValidLead());

    expect(createSpy).toHaveBeenCalledWith(expect.objectContaining({
      email: 'john@example.com',
      formType: 'commerce',
      formId: MOCK_FORM.id,
    }));
  });

  it('lança 400 quando formType está ausente', async () => {
    const { formType, ...incomplete } = makeValidLead();
    await expect(service.submitLead(incomplete)).rejects.toMatchObject({
      status: 400,
      message: "Field 'formType' is required",
    });
  });

  it('lança 400 quando formType é inválido (não existe no banco)', async () => {
    vi.spyOn(formRepo, 'findBySlug').mockResolvedValue(null);
    await expect(service.submitLead(makeValidLead({ formType: 'invalid_type' }))).rejects.toMatchObject({
      status: 400,
      message: expect.stringContaining('Invalid formType'),
    });
  });

  it('lança 400 quando campo obrigatório está ausente', async () => {
    const { name, ...incomplete } = makeValidLead();
    await expect(service.submitLead(incomplete)).rejects.toMatchObject({
      status: 400,
      message: "Field 'name' is required",
    });
  });

  it('lança 400 quando e-mail é inválido', async () => {
    await expect(service.submitLead(makeValidLead({ email: 'not-an-email' }))).rejects.toMatchObject({
      status: 400,
      message: 'Invalid email format',
    });
  });

  it('lança 400 quando estado não é sigla de 2 letras', async () => {
    await expect(service.submitLead(makeValidLead({ state: 'São Paulo' }))).rejects.toMatchObject({
      status: 400,
      message: 'State must be a 2-letter UF code (e.g. SP)',
    });
  });

  it('lança 400 quando diagnosis é array em vez de objeto', async () => {
    await expect(service.submitLead(makeValidLead({ diagnosis: [] }))).rejects.toMatchObject({
      status: 400,
      message: 'Field diagnosis must be an object',
    });
  });
});

// ─── Scoring — commerce ──────────────────────────────────────────────────────

describe('diagnosis service — scoring commerce', () => {
  it('atribui temperatura "hot" para diagnóstico de alto score', async () => {
    mockForm({ id: 'form-commerce', slug: 'commerce', isActive: true });
    vi.spyOn(repo, 'create').mockImplementation(async (data) => ({ ...data, id: 'c-hot' }));

    const result = await service.submitLead(makeValidLead({
      formType: 'commerce',
      diagnosis: {
        digital_presence: { generates_real_opportunities: 'Não gera', well_positioned: 'Não' },
        commercial: { uses_crm: 'Não', structured_sales_process: 'Não' },
        positioning: { clear_differential: 'Não' },
      },
    }));

    expect(result.leadTemperature).toBe('hot');
    expect(result.score).toBeGreaterThanOrEqual(60);
  });

  it('atribui temperatura "warm" para score intermediário', async () => {
    mockForm({ id: 'form-commerce', slug: 'commerce', isActive: true });
    vi.spyOn(repo, 'create').mockImplementation(async (data) => ({ ...data, id: 'c-warm' }));

    const result = await service.submitLead(makeValidLead({
      formType: 'commerce',
      diagnosis: {
        digital_presence: { generates_real_opportunities: 'Pouco' },
        commercial: { structured_sales_process: 'Parcial' },
        positioning: { communication: 'Genérica' },
        growth: { has_growth_goal: 'Sim' },
      },
    }));

    expect(result.leadTemperature).toBe('warm');
    expect(result.score).toBeGreaterThanOrEqual(30);
    expect(result.score).toBeLessThan(60);
  });

  it('atribui temperatura "cold" para diagnóstico vazio', async () => {
    mockForm({ id: 'form-commerce', slug: 'commerce', isActive: true });
    vi.spyOn(repo, 'create').mockImplementation(async (data) => ({ ...data, id: 'c-cold' }));

    const result = await service.submitLead(makeValidLead({ formType: 'commerce' }));

    expect(result.leadTemperature).toBe('cold');
    expect(result.score).toBe(0);
  });
});

// ─── Scoring — industry ──────────────────────────────────────────────────────

describe('diagnosis service — scoring industry', () => {
  it('atribui temperatura "hot" para diagnóstico de alto score', async () => {
    mockForm({ id: 'form-industry', slug: 'industry', isActive: true });
    vi.spyOn(repo, 'create').mockImplementation(async (data) => ({ ...data, id: 'i-hot' }));

    const result = await service.submitLead(makeValidLead({
      formType: 'industry',
      diagnosis: {
        digital_presence: { marketing_generates_opportunities: 'Não gera', well_positioned_digitally: 'Não' },
        commercial: { uses_crm: 'Não', structured_sales_process: 'Não' },
        positioning: { clear_differential: 'Não' },
      },
    }));

    expect(result.leadTemperature).toBe('hot');
    expect(result.score).toBeGreaterThanOrEqual(60);
  });
});

// ─── Scoring — health ────────────────────────────────────────────────────────

describe('diagnosis service — scoring health', () => {
  it('atribui temperatura "hot" para diagnóstico de alto score', async () => {
    mockForm({ id: 'form-health', slug: 'health', isActive: true });
    vi.spyOn(repo, 'create').mockImplementation(async (data) => ({ ...data, id: 'h-hot' }));

    const result = await service.submitLead(makeValidLead({
      formType: 'health',
      diagnosis: {
        digital_presence: { generates_new_patients: 'Não gera', patient_understands_services: 'Não' },
        organization_and_relationship: { uses_system: 'Não', organized_process: 'Não' },
        positioning: { clear_differential: 'Não', well_positioned: 'Não' },
      },
    }));

    expect(result.leadTemperature).toBe('hot');
    expect(result.score).toBeGreaterThanOrEqual(60);
  });
});

// ─── Scoring — services ──────────────────────────────────────────────────────

describe('diagnosis service — scoring services', () => {
  it('atribui temperatura "hot" para diagnóstico de alto score', async () => {
    mockForm({ id: 'form-services', slug: 'services', isActive: true });
    vi.spyOn(repo, 'create').mockImplementation(async (data) => ({ ...data, id: 's-hot' }));

    const result = await service.submitLead(makeValidLead({
      formType: 'services',
      diagnosis: {
        digital_presence: { generates_new_clients: 'Não gera', well_positioned: 'Não' },
        commercial: { uses_system_or_tool: 'Não', structured_process: 'Não' },
        positioning: { clear_differential: 'Não' },
      },
    }));

    expect(result.leadTemperature).toBe('hot');
    expect(result.score).toBeGreaterThanOrEqual(60);
  });
});

// ─── Scoring — agro ──────────────────────────────────────────────────────────

describe('diagnosis service — scoring agro', () => {
  it('atribui temperatura "hot" para diagnóstico de alto score', async () => {
    mockForm({ id: 'form-agro', slug: 'agro', isActive: true });
    vi.spyOn(repo, 'create').mockImplementation(async (data) => ({ ...data, id: 'a-hot' }));

    const result = await service.submitLead(makeValidLead({
      formType: 'agro',
      diagnosis: {
        digital_presence: { marketing_generates_opportunities: 'Não gera', client_understands_offer: 'Não', well_positioned: 'Não' },
        commercial: { uses_crm: 'Não', structured_sales_process: 'Não' },
        positioning: { clear_differential: 'Não' },
      },
    }));

    expect(result.leadTemperature).toBe('hot');
    expect(result.score).toBeGreaterThanOrEqual(60);
  });
});

// ─── formType persiste no lead salvo ─────────────────────────────────────────

describe('diagnosis service — formType persisted', () => {
  it.each(['agro', 'commerce', 'industry', 'services', 'health'])('salva formType="%s" no repositório', async (formType) => {
    mockForm({ id: `form-${formType}`, slug: formType, isActive: true });
    const createSpy = vi.spyOn(repo, 'create').mockResolvedValue({ id: 'x', formType });

    await service.submitLead(makeValidLead({ formType }));

    expect(createSpy).toHaveBeenCalledWith(expect.objectContaining({ formType, formId: `form-${formType}` }));
  });
});

// ─── listLeads ───────────────────────────────────────────────────────────────

describe('diagnosis service — listLeads', () => {
  it('repassa filtros para o repositório', async () => {
    const findAllSpy = vi.spyOn(repo, 'findAll').mockResolvedValue([]);

    await service.listLeads({ formType: 'health', status: 'new' });

    expect(findAllSpy).toHaveBeenCalledWith({ formType: 'health', status: 'new' });
  });
});

// ─── getLeadById ─────────────────────────────────────────────────────────────

describe('diagnosis service — getLeadById', () => {
  it('retorna o lead quando encontrado', async () => {
    vi.spyOn(repo, 'findById').mockResolvedValue({ id: 'lead-42' });

    const result = await service.getLeadById('lead-42');

    expect(result).toEqual({ id: 'lead-42' });
  });

  it('lança 404 quando lead não existe', async () => {
    vi.spyOn(repo, 'findById').mockResolvedValue(null);

    await expect(service.getLeadById('missing')).rejects.toMatchObject({ status: 404 });
  });
});

// ─── updateLeadStatus ─────────────────────────────────────────────────────────

describe('diagnosis service — updateLeadStatus', () => {
  it('atualiza o status quando válido', async () => {
    vi.spyOn(repo, 'findById').mockResolvedValue({ id: 'lead-1' });
    const updateSpy = vi.spyOn(repo, 'updateStatus').mockResolvedValue({ id: 'lead-1', status: 'contacted' });

    await service.updateLeadStatus('lead-1', 'contacted');

    expect(updateSpy).toHaveBeenCalledWith('lead-1', 'contacted');
  });

  it('lança 400 para status inválido', async () => {
    await expect(service.updateLeadStatus('lead-1', 'invalid_status')).rejects.toMatchObject({
      status: 400,
      message: expect.stringContaining('Invalid status'),
    });
  });

  it('lança 404 quando lead não existe', async () => {
    vi.spyOn(repo, 'findById').mockResolvedValue(null);

    await expect(service.updateLeadStatus('missing', 'contacted')).rejects.toMatchObject({ status: 404 });
  });
});

// ─── createForm ──────────────────────────────────────────────────────────────

describe('diagnosis service — createForm', () => {
  const VALID_FORM = { slug: 'new-form', title: 'New Form', sections: [{ key: 'sec1', title: 'Section 1', questions: [] }] };

  it('cria um formulário com dados válidos', async () => {
    vi.spyOn(formRepo, 'findBySlug').mockResolvedValue(null);
    const createSpy = vi.spyOn(formRepo, 'createForm').mockResolvedValue({ id: 'f-1', ...VALID_FORM });

    await service.createForm(VALID_FORM);

    expect(createSpy).toHaveBeenCalledWith(expect.objectContaining({ slug: 'new-form', title: 'New Form' }));
  });

  it('lança 400 quando slug está ausente', async () => {
    const { slug, ...incomplete } = VALID_FORM;
    await expect(service.createForm(incomplete)).rejects.toMatchObject({
      status: 400,
      message: "Field 'slug' is required",
    });
  });

  it('lança 400 quando slug tem formato inválido', async () => {
    await expect(service.createForm({ ...VALID_FORM, slug: 'Invalid Slug!' })).rejects.toMatchObject({
      status: 400,
      message: expect.stringContaining('slug'),
    });
  });

  it('lança 400 quando sections não é array', async () => {
    await expect(service.createForm({ ...VALID_FORM, sections: 'not-an-array' })).rejects.toMatchObject({
      status: 400,
      message: 'Field sections must be an array',
    });
  });

  it('lança 409 quando slug já existe', async () => {
    vi.spyOn(formRepo, 'findBySlug').mockResolvedValue({ id: 'existing' });

    await expect(service.createForm(VALID_FORM)).rejects.toMatchObject({
      status: 409,
      message: expect.stringContaining("already exists"),
    });
  });
});

// ─── updateForm ──────────────────────────────────────────────────────────────

describe('diagnosis service — updateForm', () => {
  it('atualiza título e sections', async () => {
    vi.spyOn(formRepo, 'findBySlug').mockResolvedValue({ id: 'f-1', slug: 'commerce' });
    const updateSpy = vi.spyOn(formRepo, 'update').mockResolvedValue({ id: 'f-1', slug: 'commerce', title: 'Updated' });

    await service.updateForm('commerce', { title: 'Updated' });

    expect(updateSpy).toHaveBeenCalledWith('commerce', { title: 'Updated' });
  });

  it('lança 404 quando formulário não existe', async () => {
    vi.spyOn(formRepo, 'findBySlug').mockResolvedValue(null);

    await expect(service.updateForm('missing', { title: 'X' })).rejects.toMatchObject({ status: 404 });
  });

  it('lança 400 quando nenhum campo válido é enviado', async () => {
    vi.spyOn(formRepo, 'findBySlug').mockResolvedValue({ id: 'f-1', slug: 'commerce' });

    await expect(service.updateForm('commerce', {})).rejects.toMatchObject({
      status: 400,
      message: expect.stringContaining('No valid fields'),
    });
  });
});

// ─── deleteForm ──────────────────────────────────────────────────────────────

describe('diagnosis service — deleteForm', () => {
  it('deleta formulário existente', async () => {
    vi.spyOn(formRepo, 'findBySlug').mockResolvedValue({ id: 'f-1', slug: 'commerce' });
    const removeSpy = vi.spyOn(formRepo, 'remove').mockResolvedValue({ id: 'f-1' });

    await service.deleteForm('commerce');

    expect(removeSpy).toHaveBeenCalledWith('commerce');
  });

  it('lança 404 quando formulário não existe', async () => {
    vi.spyOn(formRepo, 'findBySlug').mockResolvedValue(null);

    await expect(service.deleteForm('missing')).rejects.toMatchObject({ status: 404 });
  });
});

// ─── listForms ───────────────────────────────────────────────────────────────

describe('diagnosis service — listForms', () => {
  it('retorna apenas formulários ativos por padrão', async () => {
    const findAllSpy = vi.spyOn(formRepo, 'findAll').mockResolvedValue([]);

    await service.listForms();

    expect(findAllSpy).toHaveBeenCalledWith(true);
  });

  it('retorna todos quando activeOnly=false', async () => {
    const findAllSpy = vi.spyOn(formRepo, 'findAll').mockResolvedValue([]);

    await service.listForms(false);

    expect(findAllSpy).toHaveBeenCalledWith(false);
  });
});
