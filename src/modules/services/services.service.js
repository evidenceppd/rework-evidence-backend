'use strict';

const repo = require('./services.repository');
const { AppError } = require('../../utils/errors');
const { sanitizeDeep } = require('../../utils/sanitize');

const PAGE_REQUIRED = ['title', 'subtitle', 'explanation', 'businessAccelerator', 'results', 'cardFooter'];
const CARD_REQUIRED = ['cardIcon', 'title', 'description', 'topics'];

function validatePage(data) {
  for (const field of PAGE_REQUIRED) {
    if (data[field] == null) throw new AppError(`Field '${field}' is required`);
  }
}

function validateCard(data) {
  for (const field of CARD_REQUIRED) {
    if (data[field] == null) throw new AppError(`Field '${field}' is required`);
  }
}

// Page

async function getPage() {
  const page = await repo.findFirst();
  if (!page) throw new AppError('Services page not found', 404);
  return page;
}

async function upsertPage(data) {
  const safeData = sanitizeDeep(data);
  const existing = await repo.findFirst();

  if (!existing) {
    validatePage(safeData);
    const { title, subtitle, explanation, businessAccelerator, results, cardFooter } = safeData;
    return repo.createPage({ title, subtitle, explanation, businessAccelerator, results, cardFooter });
  }

  const payload = {};
  for (const f of PAGE_REQUIRED) {
    if (safeData[f] != null) payload[f] = safeData[f];
  }
  if (Object.keys(payload).length === 0) throw new AppError('No valid fields provided for update');
  return repo.updatePage(existing.id, payload);
}

// Cards

async function listCards() {
  const page = await repo.findFirst();
  if (!page) throw new AppError('Services page not found', 404);
  return repo.findAllCards(page.id);
}

async function getCard(id) {
  const card = await repo.findCardById(id);
  if (!card) throw new AppError('Service card not found', 404);
  return card;
}

async function createCard(data) {
  const safeData = sanitizeDeep(data);
  validateCard(safeData);
  const page = await repo.findFirst();
  if (!page) throw new AppError('Services page must be created before adding cards');
  const { cardIcon, title, description, topics } = safeData;
  return repo.createCard({ cardIcon, title, description, topics, servicesPageId: page.id });
}

async function updateCard(id, data) {
  await getCard(id);
  const safeData = sanitizeDeep(data);
  const payload = {};
  if (safeData.cardIcon != null) payload.cardIcon = safeData.cardIcon;
  if (safeData.title != null) payload.title = safeData.title;
  if (safeData.description != null) payload.description = safeData.description;
  if (safeData.topics != null) payload.topics = safeData.topics;
  return repo.updateCard(id, payload);
}

async function deleteCard(id) {
  await getCard(id);
  return repo.deleteCard(id);
}

module.exports = { getPage, upsertPage, listCards, getCard, createCard, updateCard, deleteCard };
