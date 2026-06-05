'use strict';

const { prisma } = require('../../lib/prisma');

// Clients page

async function findFirst() {
  return prisma.clientsPage.findFirst({ include: { companies: { orderBy: { createdAt: 'asc' } } } });
}

async function upsertPage(homePageId, data) {
  return prisma.clientsPage.upsert({
    where: { homePageId },
    create: { homePageId, ...data },
    update: data,
    include: { companies: { orderBy: { createdAt: 'asc' } } },
  });
}

// Companies

async function findAllCompanies(clientsPageId) {
  return prisma.company.findMany({ where: { clientsPageId }, orderBy: { createdAt: 'asc' } });
}

async function findCompanyById(id) {
  return prisma.company.findUnique({ where: { id } });
}

async function createCompany(data) {
  return prisma.company.create({ data });
}

async function updateCompany(id, data) {
  return prisma.company.update({ where: { id }, data });
}

async function deleteCompany(id) {
  return prisma.company.delete({ where: { id } });
}

async function updatePage(id, data) {
  return prisma.clientsPage.update({ where: { id }, data });
}

module.exports = {
  findFirst,
  upsertPage,
  updatePage,
  findAllCompanies,
  findCompanyById,
  createCompany,
  updateCompany,
  deleteCompany,
};
