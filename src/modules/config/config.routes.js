'use strict';

const { Router } = require('express');
const controller = require('./config.controller');

const router = Router();

/**
 * @openapi
 * /api/config:
 *   get:
 *     tags: [Config]
 *     summary: Get site configuration
 *     responses:
 *       200:
 *         description: Site configuration
 *       404:
 *         description: Site config not found
 */
router.get('/', controller.get);

/**
 * @openapi
 * /api/config:
 *   put:
 *     tags: [Config]
 *     summary: Create or update site configuration
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [description, cnpj, socialMedia, contactUs]
 *             properties:
 *               description: { type: string }
 *               cnpj: { type: string, example: '00.000.000/0001-00' }
 *               socialMedia:
 *                 type: object
 *                 properties:
 *                   instagram: { type: string }
 *                   linkedin: { type: string }
 *                   whatsapp: { type: string }
 *               contactUs:
 *                 type: object
 *                 properties:
 *                   telefone: { type: string }
 *                   email: { type: string }
 *                   location: { type: string }
 *                   link_maps: { type: string }
 *                   where_we_are: { type: string }
 *     responses:
 *       200:
 *         description: Site config saved
 *       400:
 *         description: Validation error
 */
router.put('/', controller.upsert);

module.exports = router;
