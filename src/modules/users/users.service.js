'use strict';

const bcrypt = require('bcryptjs');
const repo = require('./users.repository');
const { AppError } = require('../../utils/errors');
const { sanitizeString } = require('../../utils/sanitize');

// Roles that can be managed via the API (MASTER users are immutable)
const MANAGEABLE_ROLES = new Set(['ADMIN', 'EDITOR']);

/**
 * Throws 403 if the actor is an EDITOR (no management rights at all).
 */
function assertNotEditor(actorRole) {
  if (actorRole === 'EDITOR') {
    throw new AppError('Insufficient permissions', 403);
  }
}

/**
 * Validates that the actor has permission to modify/delete the given target role.
 *  - MASTER targets are immutable by everyone.
 *  - ADMIN actors can only manage EDITOR targets.
 */
function assertCanActOnTarget(actorRole, targetRole) {
  if (targetRole === 'MASTER') {
    throw new AppError('Master users cannot be edited or deleted', 403);
  }
  if (actorRole === 'ADMIN' && targetRole !== 'EDITOR') {
    throw new AppError('Admins can only manage editor users', 403);
  }
}

/**
 * Validates that the actor may assign the given role to a new/updated user.
 *  - MASTER role can never be assigned via API.
 *  - ADMIN actors can only assign EDITOR role.
 */
function assertCanAssignRole(actorRole, newRole) {
  if (newRole === 'MASTER') {
    throw new AppError('Cannot assign master role via API', 403);
  }
  if (actorRole === 'ADMIN' && newRole !== 'EDITOR') {
    throw new AppError('Admins can only assign editor role', 403);
  }
}

// ─── Public service methods ───────────────────────────────────────────────────

async function listUsers(actorRole) {
  assertNotEditor(actorRole);
  return repo.findAll();
}

async function getCurrentUser(id) {
  const user = await repo.findById(id);
  if (!user) throw new AppError('User not found', 404);
  return user;
}

async function getUser(id, actorRole) {
  assertNotEditor(actorRole);
  const user = await repo.findById(id);
  if (!user) throw new AppError('User not found', 404);
  return user;
}

async function createUser(data, actorRole) {
  assertNotEditor(actorRole);

  const { email, nomeCompleto, password, role = 'EDITOR', active = true } = data;
  const safeEmail = typeof email === 'string' ? sanitizeString(email).trim() : email;
  const safeNomeCompleto = typeof nomeCompleto === 'string' ? sanitizeString(nomeCompleto).trim() : nomeCompleto;

  if (!safeEmail || !safeNomeCompleto || !password) {
    throw new AppError('email, nomeCompleto and password are required');
  }
  if (password.length < 8) {
    throw new AppError('password must be at least 8 characters');
  }

  assertCanAssignRole(actorRole, role);

  const existing = await repo.findByEmail(safeEmail);
  if (existing) throw new AppError('Email already in use', 409);

  const passwordHash = await bcrypt.hash(password, 12);
  return repo.create({ email: safeEmail, nomeCompleto: safeNomeCompleto, passwordHash, role, active });
}

async function updateUser(id, data, actorRole) {
  assertNotEditor(actorRole);

  const target = await repo.findById(id);
  if (!target) throw new AppError('User not found', 404);

  assertCanActOnTarget(actorRole, target.role);

  const { nomeCompleto, email, active, role, password } = data;
  const updateData = {};

  if (nomeCompleto !== undefined) updateData.nomeCompleto = sanitizeString(String(nomeCompleto)).trim();
  if (active !== undefined) updateData.active = active;

  if (email !== undefined) {
    const safeEmail = sanitizeString(String(email)).trim();
    const conflict = await repo.findByEmail(safeEmail);
    if (conflict && conflict.id !== id) throw new AppError('Email already in use', 409);
    updateData.email = safeEmail;
  }

  if (role !== undefined) {
    assertCanAssignRole(actorRole, role);
    updateData.role = role;
  }

  if (password !== undefined) {
    if (password.length < 8) throw new AppError('password must be at least 8 characters');
    updateData.passwordHash = await bcrypt.hash(password, 12);
  }

  if (Object.keys(updateData).length === 0) {
    throw new AppError('No valid fields to update');
  }

  return repo.update(id, updateData);
}

async function deleteUser(id, actorRole) {
  if (actorRole !== 'MASTER') {
    throw new AppError('Only master users can delete users', 403);
  }

  const target = await repo.findById(id);
  if (!target) throw new AppError('User not found', 404);

  if (target.role === 'MASTER') {
    throw new AppError('Master users cannot be deleted', 403);
  }

  await repo.remove(id);
}

module.exports = { listUsers, getCurrentUser, getUser, createUser, updateUser, deleteUser };
