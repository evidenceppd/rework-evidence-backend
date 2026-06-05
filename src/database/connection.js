'use strict';

const { prisma } = require('../lib/prisma');

async function testConnection() {
  await prisma.$connect();
}

async function disconnect() {
  await prisma.$disconnect();
}

module.exports = { prisma, testConnection, disconnect };
