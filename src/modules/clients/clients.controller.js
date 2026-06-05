'use strict';

const service = require('./clients.service');

async function getPage(req, res, next) {
  try {
    res.json({ status: 'success', data: await service.getPage() });
  } catch (err) {
    next(err);
  }
}

async function upsertPage(req, res, next) {
  try {
    res.json({ status: 'success', data: await service.upsertPage(req.body) });
  } catch (err) {
    next(err);
  }
}

async function listCompanies(req, res, next) {
  try {
    res.json({ status: 'success', data: await service.listCompanies() });
  } catch (err) {
    next(err);
  }
}

async function getCompany(req, res, next) {
  try {
    res.json({ status: 'success', data: await service.getCompany(req.params.id) });
  } catch (err) {
    next(err);
  }
}

async function createCompany(req, res, next) {
  try {
    res.status(201).json({ status: 'success', data: await service.createCompany(req.body) });
  } catch (err) {
    next(err);
  }
}

async function updateCompany(req, res, next) {
  try {
    res.json({ status: 'success', data: await service.updateCompany(req.params.id, req.body) });
  } catch (err) {
    next(err);
  }
}

async function deleteCompany(req, res, next) {
  try {
    await service.deleteCompany(req.params.id);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
}

module.exports = { getPage, upsertPage, listCompanies, getCompany, createCompany, updateCompany, deleteCompany };
