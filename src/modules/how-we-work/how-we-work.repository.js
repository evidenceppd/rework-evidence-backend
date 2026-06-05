'use strict';

const { prisma } = require('../../lib/prisma');

async function findFirst() {
  return prisma.howWeWorkPage.findFirst();
}

async function create(data) {
  return prisma.howWeWorkPage.create({ data });
}

async function update(id, data) {
  return prisma.howWeWorkPage.update({ where: { id }, data });
}

module.exports = { findFirst, create, update };
