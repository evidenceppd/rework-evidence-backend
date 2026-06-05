'use strict';

const repo = require('./how-we-work.repository');
const { AppError } = require('../../utils/errors');
const { sanitizeDeep } = require('../../utils/sanitize');

const REQUIRED = ['aboutUs', 'howWeWork', 'oursValues', 'cardFooter'];

function validateTypes(data) {
  if (data.aboutUs !== undefined && !Array.isArray(data.aboutUs?.objectives)) {
    throw new AppError("Field 'aboutUs.objectives' must be an array");
  }
  if (data.aboutUs !== undefined && !Array.isArray(data.aboutUs?.card_image)) {
    throw new AppError("Field 'aboutUs.card_image' must be an array");
  }
  if (data.howWeWork !== undefined && !Array.isArray(data.howWeWork?.processes)) {
    throw new AppError("Field 'howWeWork.processes' must be an array");
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
  if (!page) throw new AppError('How we work page not found', 404);
  return page;
}

async function upsert(data) {
  const safeData = sanitizeDeep(data);
  const existing = await repo.findFirst();

  if (!existing) {
    validate(safeData);
    const { aboutUs, howWeWork, oursValues, cardFooter } = safeData;
    return repo.create({ aboutUs, howWeWork, oursValues, cardFooter });
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
