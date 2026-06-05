'use strict';

const { prisma } = require('../../lib/prisma');

async function findUserByEmail(email) {
  return prisma.adminUser.findUnique({ where: { email } });
}

async function findUserById(id) {
  return prisma.adminUser.findUnique({ where: { id } });
}

async function createMfaCode(adminUserId, codeHash, expiresAt) {
  // Invalidate any previous unused codes for this user
  await prisma.mfaCode.updateMany({
    where: { adminUserId, used: false },
    data: { used: true },
  });
  return prisma.mfaCode.create({
    data: { adminUserId, codeHash, expiresAt },
  });
}

async function findActiveMfaCode(adminUserId) {
  return prisma.mfaCode.findFirst({
    where: {
      adminUserId,
      used: false,
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: 'desc' },
  });
}

async function markMfaCodeUsed(id) {
  return prisma.mfaCode.update({ where: { id }, data: { used: true } });
}

// Revoked tokens (blacklist)

async function revokeToken(jti, expiresAt) {
  return prisma.revokedToken.create({ data: { jti, expiresAt } });
}

async function isTokenRevoked(jti) {
  const entry = await prisma.revokedToken.findUnique({ where: { jti } });
  return entry !== null;
}

// Purge expired entries — call periodically or at startup
async function purgeExpiredRevokedTokens() {
  return prisma.revokedToken.deleteMany({ where: { expiresAt: { lt: new Date() } } });
}

module.exports = {
  findUserByEmail,
  findUserById,
  createMfaCode,
  findActiveMfaCode,
  markMfaCodeUsed,
  revokeToken,
  isTokenRevoked,
  purgeExpiredRevokedTokens,
};
