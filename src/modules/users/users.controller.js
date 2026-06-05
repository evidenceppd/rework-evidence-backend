'use strict';

const service = require('./users.service');

async function list(req, res, next) {
  try {
    const users = await service.listUsers(req.adminRole);
    res.json({ status: 'success', data: users });
  } catch (err) {
    next(err);
  }
}

async function getOne(req, res, next) {
  try {
    const user = await service.getUser(req.params.id, req.adminRole);
    res.json({ status: 'success', data: user });
  } catch (err) {
    next(err);
  }
}

async function create(req, res, next) {
  try {
    const user = await service.createUser(req.body, req.adminRole);
    res.status(201).json({ status: 'success', data: user });
  } catch (err) {
    next(err);
  }
}

async function update(req, res, next) {
  try {
    const user = await service.updateUser(req.params.id, req.body, req.adminRole);
    res.json({ status: 'success', data: user });
  } catch (err) {
    next(err);
  }
}

async function remove(req, res, next) {
  try {
    await service.deleteUser(req.params.id, req.adminRole);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
}

module.exports = { list, getOne, create, update, remove };
