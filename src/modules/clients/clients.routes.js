'use strict';

const { Router } = require('express');
const controller = require('./clients.controller');

const router = Router();

/**
 * @openapi
 * /api/clients:
 *   get:
 *     tags: [Clients]
 *     summary: Get clients page content (includes companies)
 *     responses:
 *       200:
 *         description: Clients page content
 *       404:
 *         description: Clients page not found
 */
router.get('/', controller.getPage);

/**
 * @openapi
 * /api/clients:
 *   put:
 *     tags: [Clients]
 *     summary: Create or update clients page content
 *     description: Requires the home page to exist first.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title, subtitle, cardsClients, cardFooter]
 *             properties:
 *               title: { type: string }
 *               subtitle: { type: string }
 *               cardsClients:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     icon: { type: string }
 *                     context: { type: string }
 *                     explanation: { type: string }
 *               cardFooter:
 *                 type: object
 *                 properties:
 *                   title: { type: string }
 *                   subtitle: { type: string }
 *     responses:
 *       200:
 *         description: Clients page saved
 *       400:
 *         description: Validation error
 */
router.put('/', controller.upsertPage);

/**
 * @openapi
 * /api/clients/companies:
 *   get:
 *     tags: [Companies]
 *     summary: List all companies
 *     responses:
 *       200:
 *         description: List of companies
 *       404:
 *         description: Clients page not found
 */
router.get('/companies', controller.listCompanies);

/**
 * @openapi
 * /api/clients/companies:
 *   post:
 *     tags: [Companies]
 *     summary: Add a company
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [segment, clientImage, clientDescription, clientSince]
 *             properties:
 *               segment: { type: string }
 *               clientImage: { type: string }
 *               clientDescription: { type: string }
 *               clientSince:
 *                 type: string
 *                 format: date
 *                 example: '2024-01-15'
 *     responses:
 *       201:
 *         description: Company created
 *       400:
 *         description: Validation error
 */
router.post('/companies', controller.createCompany);

/**
 * @openapi
 * /api/clients/companies/{id}:
 *   get:
 *     tags: [Companies]
 *     summary: Get a company by ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Company
 *       404:
 *         description: Company not found
 */
router.get('/companies/:id', controller.getCompany);

/**
 * @openapi
 * /api/clients/companies/{id}:
 *   put:
 *     tags: [Companies]
 *     summary: Update a company
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               segment: { type: string }
 *               clientImage: { type: string }
 *               clientDescription: { type: string }
 *               clientSince:
 *                 type: string
 *                 format: date
 *     responses:
 *       200:
 *         description: Company updated
 *       404:
 *         description: Company not found
 */
router.put('/companies/:id', controller.updateCompany);

/**
 * @openapi
 * /api/clients/companies/{id}:
 *   delete:
 *     tags: [Companies]
 *     summary: Delete a company
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       204:
 *         description: Company deleted
 *       404:
 *         description: Company not found
 */
router.delete('/companies/:id', controller.deleteCompany);

module.exports = router;
