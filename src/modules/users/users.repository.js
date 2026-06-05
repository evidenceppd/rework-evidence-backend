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

module.exports = { findAll, findById, findByEmail, create, update, remove };
