'use strict';

const repo = require('./site-content.repository');
const { AppError } = require('../../utils/errors');

function normalizeRecord(record) {
  if (!record) return null;
  return {
    id: record.id,
    pageId: record.pageId,
    route: record.route,
    content: record.content,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

async function list() {
  const rows = await repo.list();
  return rows.map(normalizeRecord);
}

async function get(pageId) {
  if (!pageId) throw new AppError('pageId is required', 400);
  const record = await repo.get(pageId);
  if (!record) throw new AppError('Site content not found', 404);
  return normalizeRecord(record);
}

async function upsert(pageId, body) {
  if (!pageId) throw new AppError('pageId is required', 400);
  const content = body?.content ?? body;
  if (!content || typeof content !== 'object' || Array.isArray(content)) {
    throw new AppError('content object is required', 400);
  }
  const record = await repo.upsert(pageId, { route: body?.route ?? content.route, content });
  return normalizeRecord(record);
}

module.exports = { list, get, upsert };
