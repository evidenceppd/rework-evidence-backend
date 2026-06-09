'use strict';

const { Router } = require('express');
const { requireAuth } = require('../../middlewares/jwt');
const { requireRole } = require('../../middlewares/role');
const controller = require('./users.controller');

const router = Router();

/**
 * @openapi
 * tags:
 *   - name: Users
 *     description: User management (master and admin only)
 */

/**
 * @openapi
 * /api/users:
 *   get:
 *     tags: [Users]
 *     summary: List all users
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of users
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Insufficient permissions
 */
router.get('/', requireAuth, requireRole('MASTER', 'ADMIN'), controller.list);
router.get('/me', requireAuth, controller.me);
router.post('/:id/send-confirmation', requireAuth, requireRole('MASTER', 'ADMIN'), controller.sendConfirmation);
router.post('/:id/confirm-email', requireAuth, requireRole('MASTER', 'ADMIN'), controller.confirmEmail);

/**
 * @openapi
 * /api/users/{id}:
 *   get:
 *     tags: [Users]
 *     summary: Get a user by ID
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: User found
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Insufficient permissions
 *       404:
 *         description: User not found
 */
router.get('/:id', requireAuth, requireRole('MASTER', 'ADMIN'), controller.getOne);

/**
 * @openapi
 * /api/users:
 *   post:
 *     tags: [Users]
 *     summary: Create a new user
 *     description: |
 *       Master can create admin or editor users.
 *       Admin can only create editor users.
 *       Editor cannot create users.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, nomeCompleto, password, role]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               nomeCompleto:
 *                 type: string
 *               password:
 *                 type: string
 *                 minLength: 8
 *               role:
 *                 type: string
 *                 enum: [ADMIN, EDITOR]
 *               active:
 *                 type: boolean
 *                 default: true
 *     responses:
 *       201:
 *         description: User created
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Insufficient permissions
 *       409:
 *         description: Email already in use
 */
router.post('/', requireAuth, requireRole('MASTER', 'ADMIN'), controller.create);

/**
 * @openapi
 * /api/users/{id}:
 *   put:
 *     tags: [Users]
 *     summary: Update a user
 *     description: |
 *       Master can update admin or editor users (not other masters).
 *       Admin can only update editor users.
 *       Master users cannot be edited by anyone.
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
 *               email:
 *                 type: string
 *                 format: email
 *               nomeCompleto:
 *                 type: string
 *               password:
 *                 type: string
 *                 minLength: 8
 *               role:
 *                 type: string
 *                 enum: [ADMIN, EDITOR]
 *               active:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: User updated
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Insufficient permissions (or target is master)
 *       404:
 *         description: User not found
 *       409:
 *         description: Email already in use
 */
router.put('/me', requireAuth, controller.updateMe);
router.put('/:id', requireAuth, requireRole('MASTER', 'ADMIN'), controller.update);

/**
 * @openapi
 * /api/users/{id}:
 *   delete:
 *     tags: [Users]
 *     summary: Delete a user (master only; cannot delete master users)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       204:
 *         description: User deleted
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Insufficient permissions or target is master
 *       404:
 *         description: User not found
 */
router.delete('/:id', requireRole('MASTER'), controller.remove);

module.exports = router;
