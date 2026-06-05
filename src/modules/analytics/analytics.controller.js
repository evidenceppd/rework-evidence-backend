'use strict';

const service = require('./analytics.service');

async function track(req, res, next) {
  try {
    res.status(201).json({ status: 'success', data: await service.track(req.body, req) });
  } catch (err) {
    next(err);
  }
}

async function stats(_req, res, next) {
  try {
    res.json({ status: 'success', data: await service.stats() });
  } catch (err) {
    next(err);
  }
}

async function viewsMonth(_req, res, next) {
  try {
    res.json({ status: 'success', data: await service.viewsMonth() });
  } catch (err) {
    next(err);
  }
}

async function devicesMonth(_req, res, next) {
  try {
    res.json({ status: 'success', data: await service.devicesMonth() });
  } catch (err) {
    next(err);
  }
}

async function dailyAverage(_req, res, next) {
  try {
    res.json({ status: 'success', data: await service.dailyAverage() });
  } catch (err) {
    next(err);
  }
}

async function last7Days(_req, res, next) {
  try {
    res.json({ status: 'success', data: await service.last7Days() });
  } catch (err) {
    next(err);
  }
}

async function topPages(req, res, next) {
  try {
    res.json({ status: 'success', data: await service.topPages(Number(req.query.limit) || 10) });
  } catch (err) {
    next(err);
  }
}

async function cleanup(req, res, next) {
  try {
    res.json({ status: 'success', data: await service.cleanup(Number(req.query.days) || 90) });
  } catch (err) {
    next(err);
  }
}

module.exports = { track, stats, viewsMonth, devicesMonth, dailyAverage, last7Days, topPages, cleanup };
