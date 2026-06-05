'use strict';

const service = require('./blog.service');

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

async function listPosts(req, res, next) {
  try {
    res.json({ status: 'success', data: await service.listPosts() });
  } catch (err) {
    next(err);
  }
}

async function getPost(req, res, next) {
  try {
    res.json({ status: 'success', data: await service.getPost(req.params.id) });
  } catch (err) {
    next(err);
  }
}

async function createPost(req, res, next) {
  try {
    res.status(201).json({ status: 'success', data: await service.createPost(req.body) });
  } catch (err) {
    next(err);
  }
}

async function updatePost(req, res, next) {
  try {
    res.json({ status: 'success', data: await service.updatePost(req.params.id, req.body) });
  } catch (err) {
    next(err);
  }
}

async function deletePost(req, res, next) {
  try {
    await service.deletePost(req.params.id);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
}

async function incrementViews(req, res, next) {
  try {
    res.json({ status: 'success', data: await service.incrementViews(req.params.id) });
  } catch (err) {
    next(err);
  }
}

module.exports = { getPage, upsertPage, listPosts, getPost, createPost, updatePost, deletePost, incrementViews };
