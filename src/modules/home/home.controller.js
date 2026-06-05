'use strict';

const service = require('./home.service');

async function get(req, res, next) {
  try {
    res.json({ status: 'success', data: await service.get() });
  } catch (err) {
    next(err);
  }
}

async function upsert(req, res, next) {
  try {
    res.json({ status: 'success', data: await service.upsert(req.body) });
  } catch (err) {
    next(err);
  }
}

module.exports = { get, upsert };
