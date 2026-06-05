'use strict';

const { Router } = require('express');
const controller = require('./services.controller');

const router = Router();

/**
 * @openapi
 * /api/services:
 *   get:
 *     tags: [Services]
 *     summary: Get services page content (includes service cards)
 *     responses:
 *       200:
 *         description: Services page content
 *       404:
 *         description: Services page not found
 */
router.get('/', controller.getPage);

/**
 * @openapi
 * /api/services:
 *   put:
 *     tags: [Services]
 *     summary: Create or update services page content
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title, subtitle, explanation, businessAccelerator, results, cardFooter]
 *             properties:
 *               title: { type: string }
 *               subtitle: { type: string }
 *               explanation: { type: string }
 *               businessAccelerator:
 *                 type: object
 *                 description: "{ title, subtitle, implementation_plan: [{icon, title, description}] }"
 *               results:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     icon: { type: string }
 *                     title: { type: string }
 *                     explanation: { type: string }
 *               cardFooter:
 *                 type: object
 *                 properties:
 *                   title: { type: string }
 *                   subtitle: { type: string }
 *     responses:
 *       200:
 *         description: Services page saved
 *       400:
 *         description: Validation error
 */
router.put('/', controller.upsertPage);

/**
 * @openapi
 * /api/services/cards:
 *   get:
 *     tags: [Service Cards]
 *     summary: List all service cards
 *     responses:
 *       200:
 *         description: List of service cards
 *       404:
 *         description: Services page not found
 */
router.get('/cards', controller.listCards);

/**
 * @openapi
 * /api/services/cards:
 *   post:
 *     tags: [Service Cards]
 *     summary: Create a new service card
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [cardIcon, title, description, topics]
 *             properties:
 *               cardIcon: { type: string }
 *               title: { type: string }
 *               description: { type: string }
 *               topics:
 *                 type: array
 *                 items: { type: string }
 *     responses:
 *       201:
 *         description: Service card created
 *       400:
 *         description: Validation error
 */
router.post('/cards', controller.createCard);

/**
 * @openapi
 * /api/services/cards/{id}:
 *   get:
 *     tags: [Service Cards]
 *     summary: Get a service card by ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Service card
 *       404:
 *         description: Service card not found
 */
router.get('/cards/:id', controller.getCard);

/**
 * @openapi
 * /api/services/cards/{id}:
 *   put:
 *     tags: [Service Cards]
 *     summary: Update a service card
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
 *               cardIcon: { type: string }
 *               title: { type: string }
 *               description: { type: string }
 *               topics:
 *                 type: array
 *                 items: { type: string }
 *     responses:
 *       200:
 *         description: Service card updated
 *       404:
 *         description: Service card not found
 */
router.put('/cards/:id', controller.updateCard);

/**
 * @openapi
 * /api/services/cards/{id}:
 *   delete:
 *     tags: [Service Cards]
 *     summary: Delete a service card
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       204:
 *         description: Service card deleted
 *       404:
 *         description: Service card not found
 */
router.delete('/cards/:id', controller.deleteCard);

module.exports = router;
