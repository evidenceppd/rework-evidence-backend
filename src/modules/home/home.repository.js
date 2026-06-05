'use strict';

const { prisma } = require('../../lib/prisma');

async function findFirst() {
  return prisma.homePage.findFirst();
}

async function create(data) {
  return prisma.homePage.create({ data });
}

async function update(id, data) {
  return prisma.homePage.update({ where: { id }, data });
}

module.exports = { findFirst, create, update };
