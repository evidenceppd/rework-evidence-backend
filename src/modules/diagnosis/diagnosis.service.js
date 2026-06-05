'use strict';

const repo = require('./diagnosis.repository');
const formRepo = require('./diagnosis.form.repository');
const { AppError } = require('../../utils/errors');
const { sanitizeDeep } = require('../../utils/sanitize');
const { calculateScore, getTemperature } = require('./diagnosis.scoring');

// ─── Lead ─────────────────────────────────────────────────────────────────────

const LEAD_REQUIRED = ['formType', 'name', 'companyName', 'phone', 'email', 'city', 'state', 'diagnosis'];
const VALID_STATUSES = ['new', 'contacted', 'qualified', 'proposal', 'lost', 'client'];
const STATE_REGEX = /^[A-Z]{2}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateLeadFields(data) {
  for (const field of LEAD_REQUIRED) {
    if (data[field] == null || data[field] === '') {
      throw new AppError(`Field '${field}' is required`);
    }
  }

  if (!EMAIL_REGEX.test(data.email)) {
    throw new AppError('Invalid email format');
  }

  if (!STATE_REGEX.test(data.state)) {
    throw new AppError('State must be a 2-letter UF code (e.g. SP)');
  }

  if (typeof data.diagnosis !== 'object' || Array.isArray(data.diagnosis)) {
    throw new AppError('Field diagnosis must be an object');
  }
}

async function submitLead(data) {
  const safeData = sanitizeDeep(data);
  validateLeadFields(safeData);

  const form = await formRepo.findBySlug(safeData.formType);
  if (!form || !form.isActive) {
    throw new AppError(
      `Invalid formType '${safeData.formType}'. Use GET /api/diagnosis/forms to list available forms`,
    );
  }

  const score = calculateScore(safeData.formType, safeData.diagnosis);
  const leadTemperature = getTemperature(score);

  const {
    formType,
    name,
    companyName,
    phone,
    email,
    city,
    state,
    segment,
    operationSize,
    marketTime,
    mainChallenge,
    growthChallenge,
    diagnosis,
  } = safeData;

  return repo.create({
    formType,
    formId: form.id,
    name,
    companyName,
    phone,
    email,
    city,
    state,
    segment: segment ?? null,
    operationSize: operationSize ?? null,
    marketTime: marketTime ?? null,
    mainChallenge: mainChallenge ?? null,
    growthChallenge: growthChallenge ?? null,
    diagnosis,
    source: 'site',
    score,
    leadTemperature,
  });
}

async function listLeads(filters) {
  return repo.findAll(filters);
}

async function getLeadById(id) {
  const lead = await repo.findById(id);
  if (!lead) throw new AppError('Lead not found', 404);
  return lead;
}

async function updateLeadStatus(id, status) {
  if (!VALID_STATUSES.includes(status)) {
    throw new AppError(`Invalid status. Allowed values: ${VALID_STATUSES.join(', ')}`);
  }

  const lead = await repo.findById(id);
  if (!lead) throw new AppError('Lead not found', 404);

  return repo.updateStatus(id, status);
}

// ─── Form CRUD ────────────────────────────────────────────────────────────────

const FORM_REQUIRED = ['slug', 'title', 'sections'];
const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function validateFormData(data) {
  for (const field of FORM_REQUIRED) {
    if (data[field] == null || data[field] === '') {
      throw new AppError(`Field '${field}' is required`);
    }
  }

  if (!SLUG_REGEX.test(data.slug)) {
    throw new AppError('Field slug must be lowercase alphanumeric, hyphens allowed (e.g. high-value-commerce)');
  }

  if (!Array.isArray(data.sections)) {
    throw new AppError('Field sections must be an array');
  }
}

async function createForm(data) {
  const safeData = sanitizeDeep(data);
  validateFormData(safeData);

  const existing = await formRepo.findBySlug(safeData.slug);
  if (existing) throw new AppError(`Form with slug '${safeData.slug}' already exists`, 409);

  return formRepo.createForm({
    slug: safeData.slug,
    title: safeData.title,
    description: safeData.description ?? null,
    sections: safeData.sections,
    isActive: safeData.isActive !== false,
  });
}

async function listForms(activeOnly = true) {
  return formRepo.findAll(activeOnly);
}

async function getFormBySlug(slug) {
  const form = await formRepo.findBySlug(slug);
  if (!form) throw new AppError(`Form '${slug}' not found`, 404);
  return form;
}

async function updateForm(slug, data) {
  const form = await formRepo.findBySlug(slug);
  if (!form) throw new AppError(`Form '${slug}' not found`, 404);

  const safeData = sanitizeDeep(data);
  const updateData = {};

  if (safeData.title !== undefined) updateData.title = safeData.title;
  if (safeData.description !== undefined) updateData.description = safeData.description;
  if (safeData.isActive !== undefined) updateData.isActive = Boolean(safeData.isActive);
  if (safeData.sections !== undefined) {
    if (!Array.isArray(safeData.sections)) throw new AppError('Field sections must be an array');
    updateData.sections = safeData.sections;
  }

  if (Object.keys(updateData).length === 0) {
    throw new AppError('No valid fields provided for update');
  }

  return formRepo.update(slug, updateData);
}

async function deleteForm(slug) {
  const form = await formRepo.findBySlug(slug);
  if (!form) throw new AppError(`Form '${slug}' not found`, 404);
  return formRepo.remove(slug);
}

module.exports = {
  submitLead,
  listLeads,
  getLeadById,
  updateLeadStatus,
  createForm,
  listForms,
  getFormBySlug,
  updateForm,
  deleteForm,
};
