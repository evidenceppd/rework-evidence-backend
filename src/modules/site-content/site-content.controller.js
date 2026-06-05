'use strict';

const service = require('./site-content.service');

async function list(req, res, next) {
  try { res.json({ status: 'success', data: await service.list() }); } catch (err) { next(err); }
}

async function get(req, res, next) {
  try { res.json({ status: 'success', data: await service.get(req.params.pageId) }); } catch (err) { next(err); }
}

async function upsert(req, res, next) {
  try { res.json({ status: 'success', data: await service.upsert(req.params.pageId, req.body) }); } catch (err) { next(err); }
}

module.exports = { list, get, upsert };
