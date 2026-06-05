'use strict';

const repo = require('./config.repository');
const { AppError } = require('../../utils/errors');
const { sanitizeDeep } = require('../../utils/sanitize');

const REQUIRED = ['description', 'cnpj', 'socialMedia', 'contactUs'];

function validate(data) {
  for (const field of REQUIRED) {
    if (data[field] == null) throw new AppError(`Field '${field}' is required`);
  }
}

async function get() {
  const config = await repo.findFirst();
  if (!config) throw new AppError('Site config not found', 404);
  return config;
}

async function upsert(data) {
  const safeData = sanitizeDeep(data);
  const existing = await repo.findFirst();

  if (!existing) {
    validate(safeData);
    const { description, cnpj, socialMedia, contactUs } = safeData;
    return repo.create({ description, cnpj, socialMedia, contactUs });
  }

  const payload = {};
  for (const f of REQUIRED) {
    if (safeData[f] != null) payload[f] = safeData[f];
  }
  if (Object.keys(payload).length === 0) throw new AppError('No valid fields provided for update');
  return repo.update(existing.id, payload);
}

module.exports = { get, upsert };
