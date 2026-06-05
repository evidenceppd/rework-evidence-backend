'use strict';

const { Router } = require('express');
const controller = require('./testimonials.controller');

const router = Router();

/**
 * @openapi
 * /api/testimonials:
 *   get:
 *     tags: [Testimonials]
 *     summary: Get testimonials page content
 *     responses:
 *       200:
 *         description: Testimonials page content
 *       404:
 *         description: Testimonials page not found
 */
router.get('/', controller.get);

/**
 * @openapi
 * /api/testimonials:
 *   put:
 *     tags: [Testimonials]
 *     summary: Create or update testimonials page content
 *     description: Requires the home page to exist first. Linked automatically via homePageId.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title, subtitle, informative, cardFooter]
 *             properties:
 *               title: { type: string }
 *               subtitle: { type: string }
 *               informative:
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
 *         description: Testimonials page saved
 *       400:
 *         description: Validation error or home page not created yet
 */
router.put('/', controller.upsert);

/**
 * @openapi
 * /api/testimonials/entries:
 *   get:
 *     tags: [Testimonials]
 *     summary: List all testimonials
 *     responses:
 *       200:
 *         description: List of testimonials
 */
router.get('/entries', controller.list);

/**
 * @openapi
 * /api/testimonials/entries:
 *   post:
 *     tags: [Testimonials]
 *     summary: Create a testimonial
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [videoLink, description, name, position, clientSince]
 *             properties:
 *               videoLink: { type: string }
 *               description: { type: string }
 *               name: { type: string }
 *               position: { type: string }
 *               clientSince: { type: string }
 *     responses:
 *       201:
 *         description: Testimonial created
 *       400:
 *         description: Validation error or home page not created yet
 */
router.post('/entries', controller.create);

/**
 * @openapi
 * /api/testimonials/entries/{id}:
 *   get:
 *     tags: [Testimonials]
 *     summary: Get a single testimonial
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Testimonial found
 *       404:
 *         description: Not found
 */
router.get('/entries/:id', controller.getOne);

/**
 * @openapi
 * /api/testimonials/entries/{id}:
 *   patch:
 *     tags: [Testimonials]
 *     summary: Update a testimonial
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
 *               videoLink: { type: string }
 *               description: { type: string }
 *               name: { type: string }
 *               position: { type: string }
 *               clientSince: { type: string }
 *     responses:
 *       200:
 *         description: Testimonial updated
 *       404:
 *         description: Not found
 */
router.patch('/entries/:id', controller.update);

/**
 * @openapi
 * /api/testimonials/entries/{id}:
 *   delete:
 *     tags: [Testimonials]
 *     summary: Delete a testimonial
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       204:
 *         description: Deleted
 *       404:
 *         description: Not found
 */
router.delete('/entries/:id', controller.remove);

module.exports = router;
