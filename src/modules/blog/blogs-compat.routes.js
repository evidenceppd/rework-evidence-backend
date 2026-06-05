'use strict';

const { Router } = require('express');
const blogService = require('./blog.service');

const router = Router();

function slugify(value) {
  return String(value || 'post')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'post';
}

function toCompatPost(post) {
  const coverImage = post.blogImage || '';
  const bannerImage = post.blogBannerImage || coverImage;
  const bannerMobileImage = post.blogBannerMobileImage || bannerImage;

  return {
    id: post.id,
    categoria: post.segment || '',
    titulo: post.title || '',
    descricao: post.subtitle || '',
    materia: post.content || '',
    imagem_capa: coverImage,
    imagem_banner: bannerImage,
    imagem_banner_mobile: bannerMobileImage,
    tempo_leitura: '',
    publicado: true,
    data_publicacao: post.createdAt,
    createdAt: post.createdAt,
    created_at: post.createdAt,
    updatedAt: post.updatedAt,
    views: post.views,
    slug: post.slug,
  };
}

function toBlogPayload(body, existingSlug) {
  const title = body.titulo ?? body.title;
  const coverImage = body.imagem_capa ?? body.imagemCapa ?? body.blogImage;
  const bannerImage = body.imagem_banner ?? body.imagemBanner ?? body.blogBannerImage;
  const bannerMobileImage = body.imagem_banner_mobile ?? body.imagemBannerMobile ?? body.blogBannerMobileImage;
  const payload = {};

  if (body.slug !== undefined || title !== undefined) payload.slug = body.slug || existingSlug || slugify(title);
  if (body.categoria !== undefined || body.segment !== undefined) payload.segment = body.categoria ?? body.segment;
  if (title !== undefined) payload.title = title;
  if (body.descricao !== undefined || body.subtitle !== undefined) payload.subtitle = body.descricao ?? body.subtitle;
  if (body.materia !== undefined || body.content !== undefined) payload.content = body.materia ?? body.content;
  if (coverImage !== undefined) payload.blogImage = coverImage;
  if (bannerImage !== undefined) payload.blogBannerImage = bannerImage;
  if (bannerMobileImage !== undefined) payload.blogBannerMobileImage = bannerMobileImage;

  return payload;
}

function ensureCreatePayload(payload) {
  if (!payload.title) payload.title = 'Post sem título';
  if (!payload.slug) payload.slug = slugify(payload.title);
  if (!payload.segment) payload.segment = 'Blog';
  if (!payload.subtitle) payload.subtitle = 'Resumo indisponível.';
  if (!payload.content) payload.content = payload.subtitle;
  if (!payload.blogImage) payload.blogImage = '/banner-blog.png';
  if (!payload.blogBannerImage) payload.blogBannerImage = payload.blogImage;
  if (!payload.blogBannerMobileImage) payload.blogBannerMobileImage = payload.blogBannerImage;
  return payload;
}

function isMissingBlogPage(err) {
  return err?.status === 404 && /blog page/i.test(err.message || '');
}

router.get('/', async (_req, res, next) => {
  try {
    const posts = await blogService.listPosts();
    res.json({ status: 'success', data: posts.map(toCompatPost) });
  } catch (err) {
    if (isMissingBlogPage(err)) {
      return res.json({ status: 'success', data: [] });
    }
    next(err);
  }
});

router.get('/published', async (_req, res, next) => {
  try {
    const posts = await blogService.listPosts();
    res.json({ status: 'success', data: posts.map(toCompatPost) });
  } catch (err) {
    if (isMissingBlogPage(err)) {
      return res.json({ status: 'success', data: [] });
    }
    next(err);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    res.json({ status: 'success', data: toCompatPost(await blogService.getPost(req.params.id)) });
  } catch (err) {
    next(err);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const payload = ensureCreatePayload(toBlogPayload(req.body));
    const post = await blogService.createPost(payload);
    res.status(201).json({ status: 'success', data: toCompatPost(post) });
  } catch (err) {
    next(err);
  }
});

router.put('/:id', async (req, res, next) => {
  try {
    const current = await blogService.getPost(req.params.id);
    const payload = toBlogPayload(req.body, current.slug);
    const post = await blogService.updatePost(req.params.id, payload);
    res.json({ status: 'success', data: toCompatPost(post) });
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    await blogService.deletePost(req.params.id);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

module.exports = router;
