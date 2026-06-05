'use strict';

const { prisma } = require('../../lib/prisma');

// Testimonials page

async function findFirst() {
  return prisma.testimonialsPage.findFirst();
}

async function upsert(homePageId, data) {
  return prisma.testimonialsPage.upsert({
    where: { homePageId },
    create: { homePageId, ...data },
    update: data,
  });
}

// Testimonial records

async function findAllByHome(homePageId) {
  return prisma.testimonial.findMany({ where: { homePageId }, orderBy: { createdAt: 'asc' } });
}

async function findById(id) {
  return prisma.testimonial.findUnique({ where: { id } });
}

async function createTestimonial(data) {
  return prisma.testimonial.create({ data });
}

async function updateTestimonial(id, data) {
  return prisma.testimonial.update({ where: { id }, data });
}

async function deleteTestimonial(id) {
  return prisma.testimonial.delete({ where: { id } });
}

async function updatePage(id, data) {
  return prisma.testimonialsPage.update({ where: { id }, data });
}

module.exports = {
  findFirst,
  upsert,
  updatePage,
  findAllByHome,
  findById,
  createTestimonial,
  updateTestimonial,
  deleteTestimonial,
};
