'use strict';

const { prisma } = require('../../lib/prisma');

async function createForm(data) {
  return prisma.diagnosticForm.create({ data });
}

async function findAll(activeOnly = true) {
  return prisma.diagnosticForm.findMany({
    where: activeOnly ? { isActive: true } : {},
    orderBy: { createdAt: 'asc' },
    select: {
      id: true,
      slug: true,
      title: true,
      description: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
    },
  });
}

async function findBySlug(slug) {
  return prisma.diagnosticForm.findUnique({ where: { slug } });
}

async function update(slug, data) {
  return prisma.diagnosticForm.update({ where: { slug }, data });
}

async function remove(slug) {
  return prisma.diagnosticForm.delete({ where: { slug } });
}

module.exports = { createForm, findAll, findBySlug, update, remove };
