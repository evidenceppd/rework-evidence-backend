'use strict';

const { Router } = require('express');
const controller = require('./how-we-work.controller');

const router = Router();

/**
 * @openapi
 * /api/how-we-work:
 *   get:
 *     tags: [How We Work]
 *     summary: Get how we work page content
 *     responses:
 *       200:
 *         description: How we work page content
 *       404:
 *         description: How we work page not found
 */
router.get('/', controller.get);

/**
 * @openapi
 * /api/how-we-work:
 *   put:
 *     tags: [How We Work]
 *     summary: Create or update how we work page content
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [aboutUs, howWeWork, oursValues, cardFooter]
 *             properties:
 *               aboutUs:
 *                 type: object
 *                 required: [title, subtitle, objectives, image, card_image]
 *                 properties:
 *                   title: { type: string }
 *                   subtitle: { type: string }
 *                   objectives:
 *                     type: array
 *                     items:
 *                       type: object
 *                       properties:
 *                         icons: { type: string }
 *                         title: { type: string }
 *                         subtitle: { type: string }
 *                   image: { type: string }
 *                   card_image:
 *                     type: array
 *                     items:
 *                       type: object
 *                       properties:
 *                         icon: { type: string }
 *                         title: { type: string }
 *                         number: { type: string }
 *                         text: { type: string }
 *               howWeWork:
 *                 type: object
 *                 required: [title, subtitle, processes]
 *                 properties:
 *                   title: { type: string }
 *                   subtitle: { type: string }
 *                   processes:
 *                     type: array
 *                     items:
 *                       type: object
 *                       properties:
 *                         icon: { type: string }
 *                         title: { type: string }
 *                         description: { type: string }
 *               oursValues:
 *                 type: object
 *                 required: [icon, title, description]
 *                 properties:
 *                   icon: { type: string }
 *                   title: { type: string }
 *                   description: { type: string }
 *               cardFooter:
 *                 type: object
 *                 properties:
 *                   title: { type: string }
 *                   subtitle: { type: string }
 *     responses:
 *       200:
 *         description: How we work page saved
 *       400:
 *         description: Validation error
 */
router.put('/', controller.upsert);

module.exports = router;
