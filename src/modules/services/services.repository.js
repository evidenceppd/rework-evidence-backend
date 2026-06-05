'use strict';

const { prisma } = require('../../lib/prisma');

// Services page

async function findFirst() {
  return prisma.servicesPage.findFirst({ include: { serviceCards: { orderBy: { createdAt: 'asc' } } } });
}

async function createPage(data) {
  return prisma.servicesPage.create({ data, include: { serviceCards: true } });
}

async function updatePage(id, data) {
  return prisma.servicesPage.update({ where: { id }, data, include: { serviceCards: { orderBy: { createdAt: 'asc' } } } });
}

// Service cards

async function findAllCards(servicesPageId) {
  return prisma.serviceCard.findMany({ where: { servicesPageId }, orderBy: { createdAt: 'asc' } });
}

async function findCardById(id) {
  return prisma.serviceCard.findUnique({ where: { id } });
}

async function createCard(data) {
  return prisma.serviceCard.create({ data });
}

async function updateCard(id, data) {
  return prisma.serviceCard.update({ where: { id }, data });
}

async function deleteCard(id) {
  return prisma.serviceCard.delete({ where: { id } });
}

module.exports = {
  findFirst,
  createPage,
  updatePage,
  findAllCards,
  findCardById,
  createCard,
  updateCard,
  deleteCard,
};
