'use strict';

const { prisma } = require('../../lib/prisma');

async function create(data) {
  return prisma.lead.create({ data });
}

async function findAll(filters = {}) {
  const where = {};

  if (filters.formType) where.formType = filters.formType;
  if (filters.status) where.status = filters.status;
  if (filters.leadTemperature) where.leadTemperature = filters.leadTemperature;
  if (filters.segment) where.segment = filters.segment;
  if (filters.state) where.state = filters.state;
  if (filters.city) where.city = filters.city;
  if (filters.operationSize) where.operationSize = filters.operationSize;
  if (filters.marketTime) where.marketTime = filters.marketTime;
  if (filters.mainChallenge) where.mainChallenge = filters.mainChallenge;

  return prisma.lead.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      formType: true,
      companyName: true,
      name: true,
      phone: true,
      city: true,
      state: true,
      segment: true,
      mainChallenge: true,
      score: true,
      leadTemperature: true,
      status: true,
      createdAt: true,
    },
  });
}

async function findById(id) {
  return prisma.lead.findUnique({ where: { id } });
}

async function updateStatus(id, status) {
  return prisma.lead.update({ where: { id }, data: { status } });
}

module.exports = { create, findAll, findById, updateStatus };
