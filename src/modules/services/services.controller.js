'use strict';

const service = require('./services.service');

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

async function listCards(req, res, next) {
  try {
    res.json({ status: 'success', data: await service.listCards() });
  } catch (err) {
    next(err);
  }
}

async function getCard(req, res, next) {
  try {
    res.json({ status: 'success', data: await service.getCard(req.params.id) });
  } catch (err) {
    next(err);
  }
}

async function createCard(req, res, next) {
  try {
    res.status(201).json({ status: 'success', data: await service.createCard(req.body) });
  } catch (err) {
    next(err);
  }
}

async function updateCard(req, res, next) {
  try {
    res.json({ status: 'success', data: await service.updateCard(req.params.id, req.body) });
  } catch (err) {
    next(err);
  }
}

async function deleteCard(req, res, next) {
  try {
    await service.deleteCard(req.params.id);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
}

module.exports = { getPage, upsertPage, listCards, getCard, createCard, updateCard, deleteCard };
