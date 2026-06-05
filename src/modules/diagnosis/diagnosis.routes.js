'use strict';

const { Router } = require('express');
const { requireAuth } = require('../../middlewares/jwt');
const { requireRole } = require('../../middlewares/role');
const { createRequestRateLimiter } = require('../../middlewares/rate-limit');
const controller = require('./diagnosis.controller');

// 20 submissions per IP per minute; block for 60s on breach.
// Prevents DB flooding via the public lead-submission endpoint.
const leadSubmissionLimiter = createRequestRateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 20,
  blockDurationMs: 60 * 1000,
});

const router = Router();

// ── Formulários — públicos ────────────────────────────────────────────────────

/**
 * @openapi
 * /api/diagnosis/forms:
 *   get:
 *     tags: [Diagnosis]
 *     summary: Lista os formulários disponíveis
 *     parameters:
 *       - in: query
 *         name: activeOnly
 *         schema: { type: boolean }
 *         description: "false para incluir formulários inativos (admin)"
 *     responses:
 *       '200':
 *         description: Lista de formulários
 */
router.get('/forms', controller.listForms);

/**
 * @openapi
 * /api/diagnosis/forms/{slug}/questions:
 *   get:
 *     tags: [Diagnosis]
 *     summary: Retorna as seções e perguntas de um formulário
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema: { type: string }
 *         example: commerce
 *     responses:
 *       '200':
 *         description: Formulário com seções e perguntas
 *       '404':
 *         description: Formulário não encontrado
 */
router.get('/forms/:slug/questions', controller.getFormQuestions);

// ── Formulários — admin ───────────────────────────────────────────────────────

/**
 * @openapi
 * /api/diagnosis/forms:
 *   post:
 *     tags: [Diagnosis]
 *     summary: Cria um novo formulário (admin)
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [slug, title, sections]
 *             properties:
 *               slug:
 *                 type: string
 *                 description: Identificador único (ex. commerce, health, high-value-retail)
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               isActive:
 *                 type: boolean
 *                 default: true
 *               sections:
 *                 type: array
 *                 description: Array de seções com perguntas em JSON livre
 *                 items:
 *                   type: object
 *     responses:
 *       '201':
 *         description: Formulário criado
 *       '400':
 *         description: Dados inválidos
 *       '401':
 *         description: Token ausente ou inválido
 *       '403':
 *         description: Permissão insuficiente
 *       '409':
 *         description: Slug já existe
 */
router.post('/forms', requireAuth, requireRole('MASTER', 'ADMIN'), controller.createForm);

/**
 * @openapi
 * /api/diagnosis/forms/{slug}:
 *   patch:
 *     tags: [Diagnosis]
 *     summary: Atualiza um formulário existente (admin)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema: { type: string }
 *         example: commerce
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               isActive:
 *                 type: boolean
 *               sections:
 *                 type: array
 *                 items:
 *                   type: object
 *     responses:
 *       '200':
 *         description: Formulário atualizado
 *       '400':
 *         description: Dados inválidos
 *       '401':
 *         description: Token ausente ou inválido
 *       '403':
 *         description: Permissão insuficiente
 *       '404':
 *         description: Formulário não encontrado
 */
router.patch('/forms/:slug', requireAuth, requireRole('MASTER', 'ADMIN'), controller.updateForm);

/**
 * @openapi
 * /api/diagnosis/forms/{slug}:
 *   delete:
 *     tags: [Diagnosis]
 *     summary: Remove um formulário (admin)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema: { type: string }
 *         example: commerce
 *     responses:
 *       '204':
 *         description: Formulário removido
 *       '401':
 *         description: Token ausente ou inválido
 *       '403':
 *         description: Permissão insuficiente
 *       '404':
 *         description: Formulário não encontrado
 */
router.delete('/forms/:slug', requireAuth, requireRole('MASTER', 'ADMIN'), controller.deleteForm);

// ── Leads — público ───────────────────────────────────────────────────────────

/**
 * @openapi
 * /api/diagnosis:
 *   post:
 *     tags: [Diagnosis]
 *     summary: Envia um formulário de diagnóstico preenchido
 *     description: >
 *       O campo formType deve corresponder ao slug de um formulário ativo.
 *       As respostas são armazenadas em JSON no campo diagnosis.
 *       Score e temperatura do lead são calculados automaticamente.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [formType, name, companyName, phone, email, city, state, diagnosis]
 *             properties:
 *               formType:
 *                 type: string
 *                 description: Slug do formulário (ex. commerce, health)
 *               name:
 *                 type: string
 *               companyName:
 *                 type: string
 *               phone:
 *                 type: string
 *               email:
 *                 type: string
 *                 format: email
 *               city:
 *                 type: string
 *               state:
 *                 type: string
 *                 description: Sigla UF 2 letras maiusculas
 *               segment:
 *                 type: string
 *               operationSize:
 *                 type: string
 *               marketTime:
 *                 type: string
 *               mainChallenge:
 *                 type: string
 *               growthChallenge:
 *                 type: string
 *               diagnosis:
 *                 type: object
 *                 description: Respostas do formulário organizadas por seção (JSON livre)
 *     responses:
 *       '201':
 *         description: Lead criado com score e temperatura calculados
 *       '400':
 *         description: Campos obrigatórios ausentes ou inválidos
 *       '429':
 *         description: Muitas requisições
 */
router.post('/', leadSubmissionLimiter, controller.submitLead);

// ── Leads — admin ─────────────────────────────────────────────────────────────

/**
 * @openapi
 * /api/diagnosis/leads:
 *   get:
 *     tags: [Diagnosis]
 *     summary: Lista leads (admin)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: formType
 *         schema: { type: string }
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [new, contacted, qualified, proposal, lost, client] }
 *       - in: query
 *         name: leadTemperature
 *         schema: { type: string, enum: [COLD, WARM, HOT] }
 *       - in: query
 *         name: state
 *         schema: { type: string }
 *     responses:
 *       '200':
 *         description: Lista de leads
 *       '401':
 *         description: Token ausente ou inválido
 *       '403':
 *         description: Permissão insuficiente
 */
router.get('/leads', requireAuth, requireRole('MASTER', 'ADMIN'), controller.listLeads);

/**
 * @openapi
 * /api/diagnosis/leads/{id}:
 *   get:
 *     tags: [Diagnosis]
 *     summary: Retorna um lead completo (admin)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       '200':
 *         description: Lead completo
 *       '401':
 *         description: Token ausente ou inválido
 *       '403':
 *         description: Permissão insuficiente
 *       '404':
 *         description: Lead não encontrado
 */
router.get('/leads/:id', requireAuth, requireRole('MASTER', 'ADMIN'), controller.getLeadById);

/**
 * @openapi
 * /api/diagnosis/leads/{id}/status:
 *   patch:
 *     tags: [Diagnosis]
 *     summary: Atualiza o status de um lead (admin)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [status]
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [new, contacted, qualified, proposal, lost, client]
 *                 example: contacted
 *     responses:
 *       '200':
 *         description: Status atualizado
 *       '400':
 *         description: Status inválido
 *       '401':
 *         description: Token ausente ou inválido
 *       '403':
 *         description: Permissão insuficiente
 *       '404':
 *         description: Lead não encontrado
 */
router.patch('/leads/:id/status', requireAuth, requireRole('MASTER', 'ADMIN'), controller.updateLeadStatus);

module.exports = router;
