'use strict';

const service = require('./diagnosis.service');

// ── Formulários ───────────────────────────────────────────────────────────────

async function listForms(req, res, next) {
  try {
    // Only authenticated admins may request inactive forms; anonymous callers always see active only.
    const isAdmin = !!req.adminRole;
    const activeOnly = !isAdmin || req.query.activeOnly !== 'false';
    res.json({ status: 'success', data: await service.listForms(activeOnly) });
  } catch (err) {
    next(err);
  }
}

async function getFormQuestions(req, res, next) {
  try {
    const form = await service.getFormBySlug(req.params.slug);
    res.json({
      status: 'success',
      data: { slug: form.slug, title: form.title, description: form.description, displayOrder: form.displayOrder, sections: form.sections },
    });
  } catch (err) {
    next(err);
  }
}

async function createForm(req, res, next) {
  try {
    const form = await service.createForm(req.body);
    res.status(201).json({ status: 'success', data: form });
  } catch (err) {
    next(err);
  }
}

async function updateForm(req, res, next) {
  try {
    res.json({ status: 'success', data: await service.updateForm(req.params.slug, req.body) });
  } catch (err) {
    next(err);
  }
}

async function deleteForm(req, res, next) {
  try {
    await service.deleteForm(req.params.slug);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
}

// ── Leads ─────────────────────────────────────────────────────────────────────

async function submitLead(req, res, next) {
  try {
    const lead = await service.submitLead(req.body);
    res.status(201).json({ status: 'success', data: lead });
  } catch (err) {
    next(err);
  }
}

async function listLeads(req, res, next) {
  try {
    const filters = {
      formType: req.query.formType,
      status: req.query.status,
      leadTemperature: req.query.leadTemperature,
      segment: req.query.segment,
      state: req.query.state,
      city: req.query.city,
      operationSize: req.query.operationSize,
      marketTime: req.query.marketTime,
      mainChallenge: req.query.mainChallenge,
    };
    res.json({ status: 'success', data: await service.listLeads(filters) });
  } catch (err) {
    next(err);
  }
}

async function getLeadById(req, res, next) {
  try {
    res.json({ status: 'success', data: await service.getLeadById(req.params.id) });
  } catch (err) {
    next(err);
  }
}

async function updateLeadStatus(req, res, next) {
  try {
    res.json({ status: 'success', data: await service.updateLeadStatus(req.params.id, req.body.status) });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  listForms,
  getFormQuestions,
  createForm,
  updateForm,
  deleteForm,
  submitLead,
  listLeads,
  getLeadById,
  updateLeadStatus,
};
