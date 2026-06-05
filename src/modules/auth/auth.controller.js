'use strict';

const service = require('./auth.service');

async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    const result = await service.login(email, password);
    res.json({ status: 'success', data: result });
  } catch (err) {
    next(err);
  }
}

async function verifyMfa(req, res, next) {
  try {
    const authHeader = req.headers['authorization'];
    const mfaToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
    const { code } = req.body;
    const result = await service.verifyMfa(mfaToken, code);
    res.json({ status: 'success', data: result });
  } catch (err) {
    next(err);
  }
}

async function logout(req, res, next) {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
    await service.logout(token);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
}

module.exports = { login, verifyMfa, logout };
