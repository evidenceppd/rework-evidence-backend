'use strict';

const { prisma } = require('../../lib/prisma');

async function findFirst() {
  return prisma.siteConfig.findFirst();
}

async function create(data) {
  return prisma.siteConfig.create({ data });
}

async function update(id, data) {
  return prisma.siteConfig.update({ where: { id }, data });
}

module.exports = { findFirst, create, update };
