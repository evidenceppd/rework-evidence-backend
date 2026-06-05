'use strict';

const { Router } = require('express');
const controller = require('./site-content.controller');

const router = Router();

/**
 * @openapi
 * /api/site-content:
 *   get:
 *     tags: [Site Content]
 *     summary: List all persisted site content pages
 *     responses:
 *       200:
 *         description: Site content list
 */
router.get('/', controller.list);

/**
 * @openapi
 * /api/site-content/{pageId}:
 *   get:
 *     tags: [Site Content]
 *     summary: Get persisted content for one page
 *     parameters:
 *       - in: path
 *         name: pageId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Site content page }
 *       404: { description: Site content not found }
 *   put:
 *     tags: [Site Content]
 *     summary: Create or update persisted content for one page
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: pageId
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               route: { type: string }
 *               content: { type: object }
 *     responses:
 *       200: { description: Site content saved }
 *       400: { description: Validation error }
 */
router.get('/:pageId', controller.get);
router.put('/:pageId', controller.upsert);

module.exports = router;
