'use strict';

const { Router } = require('express');
const controller = require('./auth.controller');
const { loginRateLimit, mfaRateLimit } = require('./auth.security');

const router = Router();

/**
 * @openapi
 * /api/auth/login:
 *   post:
 *     tags: [Auth]
 *     summary: Login — sends MFA code to registered email
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email: { type: string, format: email }
 *               password: { type: string, format: password }
 *     responses:
 *       200:
 *         description: MFA code sent; returns mfaToken to use in /api/auth/mfa
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status: { type: string }
 *                 data:
 *                   type: object
 *                   properties:
 *                     mfaToken: { type: string }
 *       400:
 *         description: Missing fields
 *       401:
 *         description: Invalid credentials
 *       429:
 *         description: Too many failed attempts, try again later
 */
router.post('/login', ...loginRateLimit, controller.login);

/**
 * @openapi
 * /api/auth/mfa:
 *   post:
 *     tags: [Auth]
 *     summary: Verify MFA code — returns full access token
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [code]
 *             properties:
 *               code:
 *                 type: string
 *                 description: 6-digit code received by email
 *     responses:
 *       200:
 *         description: MFA verified; returns accessToken for protected routes
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status: { type: string }
 *                 data:
 *                   type: object
 *                   properties:
 *                     accessToken: { type: string }
 *       400:
 *         description: Missing fields
 *       401:
 *         description: Invalid or expired token/code
 *       429:
 *         description: Too many failed attempts, try again later
 */
router.post('/mfa', ...mfaRateLimit, controller.verifyMfa);

/**
 * @openapi
 * /api/auth/logout:
 *   post:
 *     tags: [Auth]
 *     summary: Logout — revokes the current access token
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       204:
 *         description: Logged out successfully
 *       401:
 *         description: Invalid or missing token
 */
router.post('/logout', controller.logout);

module.exports = router;
