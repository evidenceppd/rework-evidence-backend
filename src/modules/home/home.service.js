'use strict';

const repo = require('./home.repository');
const { AppError } = require('../../utils/errors');
const { sanitizeDeep } = require('../../utils/sanitize');

const REQUIRED = ['bannerHome', 'scenario', 'bottlenecks', 'performance', 'howWeWork', 'blogSectionTitle', 'cardFooter'];

function validateTypes(data) {
  if (data.bottlenecks !== undefined && !Array.isArray(data.bottlenecks)) {
    throw new AppError("Field 'bottlenecks' must be an array");
  }
  if (data.howWeWork !== undefined && !Array.isArray(data.howWeWork)) {
    throw new AppError("Field 'howWeWork' must be an array");
  }
}

function validate(data) {
  for (const field of REQUIRED) {
    if (data[field] == null) throw new AppError(`Field '${field}' is required`);
  }
  validateTypes(data);
}

async function get() {
  const page = await repo.findFirst();
  if (!page) throw new AppError('Home page not found', 404);
  return page;
}

async function upsert(data) {
  const safeData = sanitizeDeep(data);
  const existing = await repo.findFirst();

  if (!existing) {
    validate(safeData);
    const { bannerHome, scenario, bottlenecks, performance, howWeWork, blogSectionTitle, cardFooter } = safeData;
    return repo.create({ bannerHome, scenario, bottlenecks, performance, howWeWork, blogSectionTitle, cardFooter });
  }

  const payload = {};
  for (const f of REQUIRED) {
    if (safeData[f] != null) payload[f] = safeData[f];
  }
  validateTypes(payload);
  if (Object.keys(payload).length === 0) throw new AppError('No valid fields provided for update');
  return repo.update(existing.id, payload);
}

module.exports = { get, upsert };
