'use strict';

const repo = require('./testimonials.repository');
const homeRepo = require('../home/home.repository');
const { AppError } = require('../../utils/errors');
const { sanitizeDeep, sanitizeUrl } = require('../../utils/sanitize');

const PAGE_REQUIRED = ['title', 'subtitle', 'informative', 'cardFooter'];
const TESTIMONIAL_REQUIRED = ['videoLink', 'description', 'name', 'position', 'clientSince'];

function validatePage(data) {
  for (const field of PAGE_REQUIRED) {
    if (data[field] == null) throw new AppError(`Field '${field}' is required`);
  }
  if (!Array.isArray(data.informative)) {
    throw new AppError("Field 'informative' must be an array");
  }
}

function validateTestimonial(data) {
  for (const field of TESTIMONIAL_REQUIRED) {
    if (data[field] == null) throw new AppError(`Field '${field}' is required`);
  }
}

async function getHome() {
  const home = await homeRepo.findFirst();
  if (!home) throw new AppError('Home page must be created first');
  return home;
}

// Page

async function get() {
  const page = await repo.findFirst();
  if (!page) throw new AppError('Testimonials page not found', 404);
  return page;
}

async function upsert(data) {
  const safeData = sanitizeDeep(data);
  const home = await getHome();
  const existing = await repo.findFirst();

  if (!existing) {
    validatePage(safeData);
    const { title, subtitle, informative, cardFooter } = safeData;
    return repo.upsert(home.id, { title, subtitle, informative, cardFooter });
  }

  const payload = {};
  for (const f of PAGE_REQUIRED) {
    if (safeData[f] != null) payload[f] = safeData[f];
  }
  if (payload.informative !== undefined && !Array.isArray(payload.informative)) {
    throw new AppError("Field 'informative' must be an array");
  }
  if (Object.keys(payload).length === 0) throw new AppError('No valid fields provided for update');
  return repo.updatePage(existing.id, payload);
}

// Testimonials

async function list() {
  const home = await getHome();
  return repo.findAllByHome(home.id);
}

async function getOne(id) {
  const t = await repo.findById(id);
  if (!t) throw new AppError('Testimonial not found', 404);
  return t;
}

async function create(data) {
  const safeData = sanitizeDeep(data);
  safeData.videoLink = sanitizeUrl(safeData.videoLink);
  validateTestimonial(safeData);
  const home = await getHome();
  const { videoLink, description, name, position, clientSince } = safeData;
  return repo.createTestimonial({ videoLink, description, name, position, clientSince, homePageId: home.id });
}

async function update(id, data) {
  await getOne(id);
  const safeData = sanitizeDeep(data);
  if (safeData.videoLink != null) safeData.videoLink = sanitizeUrl(safeData.videoLink);
  const payload = {};
  const fields = ['videoLink', 'description', 'name', 'position', 'clientSince'];
  for (const f of fields) {
    if (safeData[f] != null) payload[f] = safeData[f];
  }
  return repo.updateTestimonial(id, payload);
}

async function remove(id) {
  await getOne(id);
  return repo.deleteTestimonial(id);
}

module.exports = { get, upsert, list, getOne, create, update, remove };
