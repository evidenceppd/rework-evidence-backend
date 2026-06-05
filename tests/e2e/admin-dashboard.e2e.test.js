'use strict';

const app = require('../../src/app');
const analyticsService = require('../../src/modules/analytics/analytics.service');
const blogService = require('../../src/modules/blog/blog.service');
const { authHeaders, bypassTokenRevocation } = require('./helpers');

let server;
let baseUrl;

beforeAll(async () => {
  server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

afterAll(async () => {
  await new Promise((resolve, reject) => server.close((err) => (err ? reject(err) : resolve())));
});

afterEach(() => {
  vi.restoreAllMocks();
});

beforeEach(() => {
  bypassTokenRevocation();
});

describe('Admin dashboard API routes', () => {
  it.each([
    ['/api/analytics/stats', { totalViews: 0, viewsThisMonth: 0, devices: [], dailyAverage: { total: 0, average: 0, period: 'last_30_days' }, last7Days: [], topPages: [], generatedAt: '2026-06-03T00:00:00.000Z' }],
    ['/api/analytics/views-month', { count: 0, month: 6 }],
    ['/api/analytics/devices-month', []],
    ['/api/analytics/daily-average', { total: 0, average: 0, period: 'last_30_days' }],
    ['/api/analytics/last-7-days', []],
    ['/api/analytics/top-pages?limit=5', []],
  ])('returns 200 for %s', async (path, data) => {
    const methodByPath = {
      '/api/analytics/stats': 'stats',
      '/api/analytics/views-month': 'viewsMonth',
      '/api/analytics/devices-month': 'devicesMonth',
      '/api/analytics/daily-average': 'dailyAverage',
      '/api/analytics/last-7-days': 'last7Days',
      '/api/analytics/top-pages?limit=5': 'topPages',
    };
    vi.spyOn(analyticsService, methodByPath[path]).mockResolvedValue(data);

    const res = await fetch(`${baseUrl}${path}`);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.status).toBe('success');
    expect(body.data).toEqual(data);
  });

  it('records site pageviews through /api/analytics/track', async () => {
    vi.spyOn(analyticsService, 'track').mockResolvedValue({ id: 'evt-1', counted: true });

    const res = await fetch(`${baseUrl}/api/analytics/track`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: 'http://trusted.local' },
      body: JSON.stringify({ page: '/', sessionId: 'session-1' }),
    });
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.data).toEqual({ id: 'evt-1', counted: true });
  });

  it('keeps the legacy /api/blogs endpoint used by the dashboard connected to blog posts', async () => {
    vi.spyOn(blogService, 'listPosts').mockResolvedValue([
      {
        id: 'p-1',
        slug: 'post',
        segment: 'Estratégia',
        title: 'Post do Blog',
        subtitle: 'Resumo',
        content: 'Conteúdo',
        blogImage: '/uploads/post.jpg',
        views: 3,
        createdAt: '2026-06-03T00:00:00.000Z',
        updatedAt: '2026-06-03T00:00:00.000Z',
      },
    ]);

    const res = await fetch(`${baseUrl}/api/blogs`);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.status).toBe('success');
    expect(body.data[0]).toMatchObject({
      id: 'p-1',
      categoria: 'Estratégia',
      titulo: 'Post do Blog',
      imagem_capa: '/uploads/post.jpg',
    });
  });

  it('returns an empty blog list instead of 404 when the blog page is not configured yet', async () => {
    const { AppError } = require('../../src/utils/errors');
    vi.spyOn(blogService, 'listPosts').mockRejectedValue(new AppError('Blog page not found', 404));

    const res = await fetch(`${baseUrl}/api/blogs`);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data).toEqual([]);
  });

  it('supports the admin blog CRUD contract used by noticiasService through /api/blogs', async () => {
    const createdPost = {
      id: 'p-created',
      slug: 'post-criado',
      segment: 'Marketing',
      title: 'Post criado pelo admin',
      subtitle: 'Resumo do post criado',
      content: 'Conteúdo completo do post criado pelo admin',
      blogImage: '/uploads/blogs/capa.jpg',
      blogBannerImage: '/uploads/blogs/banner.jpg',
      blogBannerMobileImage: '/uploads/blogs/banner-mobile.jpg',
      views: 0,
      createdAt: '2026-06-03T00:00:00.000Z',
      updatedAt: '2026-06-03T00:00:00.000Z',
    };
    vi.spyOn(blogService, 'createPost').mockResolvedValue(createdPost);
    vi.spyOn(blogService, 'getPost').mockResolvedValue(createdPost);
    vi.spyOn(blogService, 'updatePost').mockResolvedValue({ ...createdPost, title: 'Post atualizado' });
    vi.spyOn(blogService, 'deletePost').mockResolvedValue(undefined);

    const createRes = await fetch(`${baseUrl}/api/blogs`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({
        categoria: 'Marketing',
        titulo: 'Post criado pelo admin',
        descricao: 'Resumo do post criado',
        materia: 'Conteúdo completo do post criado pelo admin',
        imagem_capa: '/uploads/blogs/capa.jpg',
        imagem_banner: '/uploads/blogs/banner.jpg',
        imagem_banner_mobile: '/uploads/blogs/banner-mobile.jpg',
      }),
    });
    const createBody = await createRes.json();

    expect(createRes.status).toBe(201);
    expect(blogService.createPost).toHaveBeenCalledWith(expect.objectContaining({
      segment: 'Marketing',
      title: 'Post criado pelo admin',
      subtitle: 'Resumo do post criado',
      content: 'Conteúdo completo do post criado pelo admin',
      blogImage: '/uploads/blogs/capa.jpg',
      blogBannerImage: '/uploads/blogs/banner.jpg',
      blogBannerMobileImage: '/uploads/blogs/banner-mobile.jpg',
    }));
    expect(createBody.data).toMatchObject({
      id: 'p-created',
      titulo: 'Post criado pelo admin',
      imagem_capa: '/uploads/blogs/capa.jpg',
      imagem_banner: '/uploads/blogs/banner.jpg',
      imagem_banner_mobile: '/uploads/blogs/banner-mobile.jpg',
    });

    const getRes = await fetch(`${baseUrl}/api/blogs/p-created`);
    const getBody = await getRes.json();
    expect(getRes.status).toBe(200);
    expect(getBody.data.materia).toBe('Conteúdo completo do post criado pelo admin');

    const updateRes = await fetch(`${baseUrl}/api/blogs/p-created`, {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify({ titulo: 'Post atualizado' }),
    });
    const updateBody = await updateRes.json();
    expect(updateRes.status).toBe(200);
    expect(updateBody.data.titulo).toBe('Post atualizado');

    const deleteRes = await fetch(`${baseUrl}/api/blogs/p-created`, {
      method: 'DELETE',
      headers: authHeaders(),
    });
    expect(deleteRes.status).toBe(204);
  });
});
