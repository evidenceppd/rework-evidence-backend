'use strict';

const repo = require('./clients.repository');
const homeRepo = require('../home/home.repository');
const { AppError } = require('../../utils/errors');
const { sanitizeDeep, sanitizeUrl } = require('../../utils/sanitize');

const PAGE_REQUIRED = ['title', 'subtitle', 'cardsClients', 'cardFooter'];
const COMPANY_REQUIRED = ['segment', 'clientImage', 'clientDescription', 'clientSince'];

function validatePage(data) {
  for (const field of PAGE_REQUIRED) {
    if (data[field] == null) throw new AppError(`Field '${field}' is required`);
  }
  if (!Array.isArray(data.cardsClients)) {
    throw new AppError("Field 'cardsClients' must be an array");
  }
}

function validateCompany(data) {
  for (const field of COMPANY_REQUIRED) {
    if (data[field] == null) throw new AppError(`Field '${field}' is required`);
  }
}

// Page

async function getPage() {
  const page = await repo.findFirst();
  if (!page) throw new AppError('Clients page not found', 404);
  return page;
}

async function upsertPage(data) {
  const safeData = sanitizeDeep(data);
  const home = await homeRepo.findFirst();
  if (!home) throw new AppError('Home page must be created before clients page');
  const existing = await repo.findFirst();

  if (!existing) {
    validatePage(safeData);
    const { title, subtitle, cardsClients, cardFooter } = safeData;
    return repo.upsertPage(home.id, { title, subtitle, cardsClients, cardFooter });
  }

  const payload = {};
  for (const f of PAGE_REQUIRED) {
    if (safeData[f] != null) payload[f] = safeData[f];
  }
  if (payload.cardsClients !== undefined && !Array.isArray(payload.cardsClients)) {
    throw new AppError("Field 'cardsClients' must be an array");
  }
  if (Object.keys(payload).length === 0) throw new AppError('No valid fields provided for update');
  return repo.updatePage(existing.id, payload);
}

// Companies

async function listCompanies() {
  const page = await repo.findFirst();
  if (!page) throw new AppError('Clients page not found', 404);
  return repo.findAllCompanies(page.id);
}

async function getCompany(id) {
  const company = await repo.findCompanyById(id);
  if (!company) throw new AppError('Company not found', 404);
  return company;
}

async function createCompany(data) {
  const safeData = sanitizeDeep(data);
  safeData.clientImage = sanitizeUrl(safeData.clientImage);
  validateCompany(safeData);
  const page = await repo.findFirst();
  if (!page) throw new AppError('Clients page must be created before adding companies');
  const { segment, clientImage, clientDescription, clientSince } = safeData;
  return repo.createCompany({
    segment,
    clientImage,
    clientDescription,
    clientSince: new Date(clientSince),
    clientsPageId: page.id,
  });
}

async function updateCompany(id, data) {
  await getCompany(id);
  const safeData = sanitizeDeep(data);
  if (safeData.clientImage != null) safeData.clientImage = sanitizeUrl(safeData.clientImage);
  const payload = {};
  if (safeData.segment != null) payload.segment = safeData.segment;
  if (safeData.clientImage != null) payload.clientImage = safeData.clientImage;
  if (safeData.clientDescription != null) payload.clientDescription = safeData.clientDescription;
  if (safeData.clientSince != null) payload.clientSince = new Date(safeData.clientSince);
  return repo.updateCompany(id, payload);
}

async function deleteCompany(id) {
  await getCompany(id);
  return repo.deleteCompany(id);
}

module.exports = { getPage, upsertPage, listCompanies, getCompany, createCompany, updateCompany, deleteCompany };
