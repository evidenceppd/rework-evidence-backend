'use strict';

const { prisma } = require('../../lib/prisma');

function list() {
  return prisma.siteContent.findMany();
}

function get(pageId) {
  return prisma.siteContent.findUnique({ where: { pageId } });
}

function upsert(pageId, data) {
  return prisma.siteContent.upsert({
    where: { pageId },
    update: { route: data.route ?? null, content: data.content },
    create: { pageId, route: data.route ?? null, content: data.content },
  });
}

module.exports = { list, get, upsert };
