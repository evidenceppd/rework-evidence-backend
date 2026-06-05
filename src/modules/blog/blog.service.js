'use strict';

const repo = require('./blog.repository');
const homeRepo = require('../home/home.repository');
const { AppError } = require('../../utils/errors');
const { sanitizeDeep, sanitizeUrl } = require('../../utils/sanitize');

const PAGE_REQUIRED = ['title', 'subtitle', 'cardFooter'];
const POST_REQUIRED = ['slug', 'segment', 'title', 'subtitle', 'content', 'blogImage'];

const DEFAULT_HOME_PAGE = {
  bannerHome: {},
  scenario: {},
  bottlenecks: [],
  performance: {},
  howWeWork: [],
  blogSectionTitle: 'Blog',
  cardFooter: {},
};

function validatePage(data) {
  for (const field of PAGE_REQUIRED) {
    if (data[field] == null) throw new AppError(`Field '${field}' is required`);
  }
}

function validatePost(data) {
  for (const field of POST_REQUIRED) {
    if (data[field] == null) throw new AppError(`Field '${field}' is required`);
  }
}

// Page

async function getPage() {
  const page = await repo.findFirst();
  if (!page) throw new AppError('Blog page not found', 404);
  return page;
}

async function upsertPage(data) {
  const safeData = sanitizeDeep(data);
  const home = await homeRepo.findFirst();
  if (!home) throw new AppError('Home page must be created before blog page');
  const existing = await repo.findFirst();

  if (!existing) {
    validatePage(safeData);
    const { title, subtitle, cardFooter } = safeData;
    return repo.upsertPage(home.id, { title, subtitle, cardFooter });
  }

  const payload = {};
  for (const f of PAGE_REQUIRED) {
    if (safeData[f] != null) payload[f] = safeData[f];
  }
  if (Object.keys(payload).length === 0) throw new AppError('No valid fields provided for update');
  return repo.updatePage(existing.id, payload);
}

// Posts

async function listPosts() {
  const page = await repo.findFirst();
  if (!page) throw new AppError('Blog page not found', 404);
  return repo.findAllPosts(page.id);
}

async function getOrCreateDefaultPage() {
  const existing = await repo.findFirst();
  if (existing) return existing;

  const home = (await homeRepo.findFirst()) || (await homeRepo.create(DEFAULT_HOME_PAGE));

  return repo.upsertPage(home.id, {
    title: 'Blog',
    subtitle: 'Conteúdos sobre marketing, vendas e crescimento empresarial',
    cardFooter: {},
  });
}

async function getPost(id) {
  const post = await repo.findPostById(id);
  if (!post) throw new AppError('Blog post not found', 404);
  return post;
}

async function createPost(data) {
  const safeData = sanitizeDeep(data);
  safeData.blogImage = sanitizeUrl(safeData.blogImage);
  if (safeData.blogBannerImage != null) safeData.blogBannerImage = sanitizeUrl(safeData.blogBannerImage);
  if (safeData.blogBannerMobileImage != null) safeData.blogBannerMobileImage = sanitizeUrl(safeData.blogBannerMobileImage);
  validatePost(safeData);
  const page = await getOrCreateDefaultPage();
  const existing = await repo.findPostBySlug(safeData.slug);
  if (existing) throw new AppError(`Slug '${safeData.slug}' is already in use`);
  const { slug, segment, title, subtitle, content, blogImage, blogBannerImage, blogBannerMobileImage } = safeData;
  return repo.createPost({
    slug,
    segment,
    title,
    subtitle,
    content,
    blogImage,
    blogBannerImage: blogBannerImage || blogImage,
    blogBannerMobileImage: blogBannerMobileImage || blogBannerImage || blogImage,
    views: 0,
    blogPageId: page.id,
  });
}

async function updatePost(id, data) {
  const safeData = sanitizeDeep(data);
  if (safeData.blogImage != null) safeData.blogImage = sanitizeUrl(safeData.blogImage);
  if (safeData.blogBannerImage != null) safeData.blogBannerImage = sanitizeUrl(safeData.blogBannerImage);
  if (safeData.blogBannerMobileImage != null) safeData.blogBannerMobileImage = sanitizeUrl(safeData.blogBannerMobileImage);
  const post = await getPost(id);
  if (safeData.slug && safeData.slug !== post.slug) {
    const existing = await repo.findPostBySlug(safeData.slug);
    if (existing) throw new AppError(`Slug '${safeData.slug}' is already in use`);
  }
  const payload = {};
  const fields = ['slug', 'segment', 'title', 'subtitle', 'content', 'blogImage', 'blogBannerImage', 'blogBannerMobileImage'];
  for (const f of fields) {
    if (safeData[f] != null) payload[f] = safeData[f];
  }
  return repo.updatePost(id, payload);
}

async function deletePost(id) {
  await getPost(id);
  return repo.deletePost(id);
}

async function incrementViews(id) {
  await getPost(id);
  return repo.incrementViews(id);
}

module.exports = { getPage, upsertPage, listPosts, getPost, createPost, updatePost, deletePost, incrementViews };
