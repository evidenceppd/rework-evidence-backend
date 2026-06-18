'use strict';

const storePath = require.resolve('../../src/modules/analytics/analytics.store');
const servicePath = require.resolve('../../src/modules/analytics/analytics.service');
const blogRepositoryPath = require.resolve('../../src/modules/blog/blog.repository');
const store = {
  readEvents: vi.fn(),
  writeEvents: vi.fn(),
};
const blogRepository = {
  findPostById: vi.fn(),
};

delete require.cache[servicePath];
require.cache[storePath] = {
  id: storePath,
  filename: storePath,
  loaded: true,
  exports: store,
};
require.cache[blogRepositoryPath] = {
  id: blogRepositoryPath,
  filename: blogRepositoryPath,
  loaded: true,
  exports: blogRepository,
};

const analyticsService = require('../../src/modules/analytics/analytics.service');

afterEach(() => {
  vi.useRealTimers();
  vi.clearAllMocks();
});

describe('analyticsService.track', () => {
  it('counts the first access from an IP', async () => {
    const now = new Date('2026-06-17T12:00:00.000Z');
    vi.useFakeTimers();
    vi.setSystemTime(now);
    store.readEvents.mockResolvedValue([]);
    store.writeEvents.mockResolvedValue(undefined);

    const result = await analyticsService.track({ page: '/clientes' }, { ip: '203.0.113.10', headers: {} });

    expect(result).toEqual({ id: expect.any(String), counted: true });
    expect(store.writeEvents).toHaveBeenCalledWith([
      expect.objectContaining({
        page: '/clientes',
        ip: '203.0.113.10',
        createdAt: now.toISOString(),
      }),
    ]);
  });

  it('does not count the same IP again within 24 hours', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-17T12:00:00.000Z'));
    store.readEvents.mockResolvedValue([
      { id: 'existing', ip: '203.0.113.10', createdAt: '2026-06-16T12:00:01.000Z' },
    ]);

    const result = await analyticsService.track({ page: '/servicos' }, { ip: '203.0.113.10', headers: {} });

    expect(result).toEqual({ id: null, counted: false });
    expect(store.writeEvents).not.toHaveBeenCalled();
  });

  it('counts different IPs and the same IP after 24 hours', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-17T12:00:00.000Z'));
    const events = [
      { id: 'recent-other-ip', ip: '203.0.113.11', createdAt: '2026-06-17T11:59:00.000Z' },
      { id: 'old-same-ip', ip: '203.0.113.10', createdAt: '2026-06-16T11:59:59.000Z' },
    ];
    const originalEvents = [...events];
    store.readEvents.mockResolvedValue(events);
    store.writeEvents.mockResolvedValue(undefined);

    const result = await analyticsService.track({ page: '/blog' }, { ip: '203.0.113.10', headers: {} });

    expect(result).toEqual({ id: expect.any(String), counted: true });
    const savedEvents = store.writeEvents.mock.calls[0][0];
    expect(savedEvents).toHaveLength(3);
    expect(savedEvents.slice(0, 2)).toEqual(originalEvents);
    expect(savedEvents[2]).toEqual(expect.objectContaining({
      page: '/blog',
      ip: '203.0.113.10',
    }));
  });

  it('uses the first forwarded IP before the proxy address', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-17T12:00:00.000Z'));
    store.readEvents.mockResolvedValue([
      { id: 'proxy-ip-event', ip: '10.0.0.5', createdAt: '2026-06-17T11:59:00.000Z' },
    ]);
    store.writeEvents.mockResolvedValue(undefined);

    const result = await analyticsService.track(
      { page: '/clientes' },
      { ip: '10.0.0.5', headers: { 'x-forwarded-for': '198.51.100.21, 10.0.0.5' } },
    );

    expect(result).toEqual({ id: expect.any(String), counted: true });
    expect(store.writeEvents.mock.calls[0][0][1]).toEqual(expect.objectContaining({
      ip: '198.51.100.21',
    }));
  });
});

describe('analyticsService.topPages', () => {
  it('loads the real blog post title for old generic events', async () => {
    store.readEvents.mockResolvedValue([
      { id: 'evt-1', page: '/blog/post-1', title: 'Post do blog', ip: '203.0.113.10', createdAt: '2026-06-17T12:00:00.000Z' },
      { id: 'evt-2', page: '/blog/post-1', title: null, ip: '203.0.113.11', createdAt: '2026-06-17T12:05:00.000Z' },
    ]);
    blogRepository.findPostById.mockResolvedValue({ id: 'post-1', title: 'Autoridade Não É Vaidade' });

    const result = await analyticsService.topPages(5);

    expect(result).toEqual([
      { page: '/blog/post-1', title: 'Autoridade Não É Vaidade', views: 2 },
    ]);
    expect(blogRepository.findPostById).toHaveBeenCalledWith('post-1');
  });

  it('keeps an explicit event title before loading the blog post fallback', async () => {
    store.readEvents.mockResolvedValue([
      { id: 'evt-1', page: '/blog/post-1', title: 'Título enviado pelo navegador', ip: '203.0.113.10', createdAt: '2026-06-17T12:00:00.000Z' },
    ]);

    const result = await analyticsService.topPages(5);

    expect(result).toEqual([
      { page: '/blog/post-1', title: 'Título enviado pelo navegador', views: 1 },
    ]);
    expect(blogRepository.findPostById).not.toHaveBeenCalled();
  });
});
