'use strict';

const service = require('./testimonials.service');

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

async function list(req, res, next) {
  try {
    res.json({ status: 'success', data: await service.list() });
  } catch (err) {
    next(err);
  }
}

async function getOne(req, res, next) {
  try {
    res.json({ status: 'success', data: await service.getOne(req.params.id) });
  } catch (err) {
    next(err);
  }
}

async function create(req, res, next) {
  try {
    res.status(201).json({ status: 'success', data: await service.create(req.body) });
  } catch (err) {
    next(err);
  }
}

async function update(req, res, next) {
  try {
    res.json({ status: 'success', data: await service.update(req.params.id, req.body) });
  } catch (err) {
    next(err);
  }
}

async function remove(req, res, next) {
  try {
    await service.remove(req.params.id);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
}

module.exports = { get, upsert, list, getOne, create, update, remove };
