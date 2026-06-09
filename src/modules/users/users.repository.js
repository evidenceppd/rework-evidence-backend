'use strict';

const { prisma } = require('../../lib/prisma');

// Fields returned to callers — never include passwordHash
const PUBLIC_SELECT = {
  id: true,
  email: true,
  nomeCompleto: true,
  role: true,
  active: true,
  createdAt: true,
  updatedAt: true,
};

async function findAll() {
  return prisma.adminUser.findMany({
    select: PUBLIC_SELECT,
    orderBy: { createdAt: 'desc' },
  });
}

async function findById(id) {
  return prisma.adminUser.findUnique({
    where: { id },
    select: PUBLIC_SELECT,
  });
}

async function findByEmail(email) {
  return prisma.adminUser.findUnique({
    where: { email },
    select: { id: true, email: true, role: true },
  });
}

async function create(data) {
  return prisma.adminUser.create({
    data,
    select: PUBLIC_SELECT,
  });
}

async function createMfaCode(adminUserId, codeHash, expiresAt) {
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

async function update(id, data) {
  return prisma.adminUser.update({
    where: { id },
    data,
    select: PUBLIC_SELECT,
  });
}

async function remove(id) {
  return prisma.adminUser.delete({ where: { id } });
}

module.exports = {
  findAll,
  findById,
  findByEmail,
  create,
  createMfaCode,
  findActiveMfaCode,
  markMfaCodeUsed,
  update,
  remove,
};
