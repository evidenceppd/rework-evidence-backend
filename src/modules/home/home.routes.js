'use strict';

const { Router } = require('express');
const controller = require('./home.controller');

const router = Router();

/**
 * @openapi
 * /api/home:
 *   get:
 *     tags: [Home]
 *     summary: Get home page content
 *     responses:
 *       200:
 *         description: Home page content retrieved successfully
 *       404:
 *         description: Home page not found
 */
router.get('/', controller.get);

/**
 * @openapi
 * /api/home:
 *   put:
 *     tags: [Home]
 *     summary: Create or update home page content
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [bannerHome, scenario, bottlenecks, performance, howWeWork, blogSectionTitle, cardFooter]
 *             properties:
 *               bannerHome:
 *                 type: object
 *                 required: [title, subtitle, banner_image, explanation]
 *                 properties:
 *                   title: { type: string }
 *                   subtitle: { type: string }
 *                   banner_image: { type: string }
 *                   explanation:
 *                     type: array
 *                     items:
 *                       type: object
 *                       properties:
 *                         icon: { type: string }
 *                         description: { type: string }
 *               scenario:
 *                 type: object
 *                 required: [title, explanation]
 *                 properties:
 *                   title: { type: string }
 *                   explanation:
 *                     type: array
 *                     items:
 *                       type: object
 *                       properties:
 *                         icon: { type: string }
 *                         description: { type: string }
 *               bottlenecks:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     icon: { type: string }
 *                     title: { type: string }
 *                     description: { type: string }
 *               performance:
 *                 type: object
 *                 required: [title, subtitle, topics, performance_image]
 *                 properties:
 *                   title: { type: string }
 *                   subtitle: { type: string }
 *                   topics:
 *                     type: array
 *                     items: { type: string }
 *                   performance_image: { type: string }
 *               howWeWork:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     icon: { type: string }
 *                     title: { type: string }
 *                     subtitle: { type: string }
 *               blogSectionTitle:
 *                 type: string
 *               cardFooter:
 *                 type: object
 *                 properties:
 *                   title: { type: string }
 *                   subtitle: { type: string }
 *     responses:
 *       200:
 *         description: Home page saved successfully
 *       400:
 *         description: Validation error
 */
router.put('/', controller.upsert);

module.exports = router;
