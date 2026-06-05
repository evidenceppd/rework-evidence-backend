'use strict';

const { prisma } = require('../../lib/prisma');

// Blog page

async function findFirst() {
  return prisma.blogPage.findFirst();
}

async function upsertPage(homePageId, data) {
  return prisma.blogPage.upsert({
    where: { homePageId },
    create: { homePageId, ...data },
    update: data,
  });
}

// Blog posts

async function findAllPosts(blogPageId) {
  return prisma.blogPost.findMany({ where: { blogPageId }, orderBy: { createdAt: 'desc' } });
}

async function findPostById(id) {
  return prisma.blogPost.findUnique({ where: { id } });
}

async function findPostBySlug(slug) {
  return prisma.blogPost.findUnique({ where: { slug } });
}

async function createPost(data) {
  return prisma.blogPost.create({ data });
}

async function updatePost(id, data) {
  return prisma.blogPost.update({ where: { id }, data });
}

async function deletePost(id) {
  return prisma.blogPost.delete({ where: { id } });
}

async function incrementViews(id) {
  return prisma.blogPost.update({ where: { id }, data: { views: { increment: 1 } } });
}

async function updatePage(id, data) {
  return prisma.blogPage.update({ where: { id }, data });
}

module.exports = {
  findFirst,
  upsertPage,
  updatePage,
  findAllPosts,
  findPostById,
  findPostBySlug,
  createPost,
  updatePost,
  deletePost,
  incrementViews,
};
