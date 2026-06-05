'use strict';

/**
 * E2E — Blog module
 *
 * Tests the full HTTP cycle for:
 *   GET  /api/blog                   (page metadata)
 *   PUT  /api/blog                   (upsert page, requires auth)
 *   GET  /api/blog/posts             (list all posts)
 *   POST /api/blog/posts             (create post, requires auth)
 *   GET  /api/blog/posts/:id         (get single post)
 *   PUT  /api/blog/posts/:id         (update post, requires auth)
 *   DELETE /api/blog/posts/:id       (delete post, requires auth)
 *   POST /api/blog/posts/:id/views   (increment views, public)
 */

const app = require('../../src/app');
const blogService = require('../../src/modules/blog/blog.service');
const { authHeaders, bypassTokenRevocation } = require('./helpers');
const { AppError } = require('../../src/utils/errors');

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

beforeEach(() => {
  bypassTokenRevocation();
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ── Blog page ─────────────────────────────────────────────────────────────────

describe('GET /api/blog', () => {
  it('returns 200 with blog page data', async () => {
    const mockPage = { id: 'blog-1', title: 'Blog', subtitle: 'Latest news', cardFooter: {} };
    vi.spyOn(blogService, 'getPage').mockResolvedValue(mockPage);

    const res = await fetch(`${baseUrl}/api/blog`);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.status).toBe('success');
    expect(body.data.title).toBe('Blog');
  });

  it('returns 404 when blog page is not configured', async () => {
    vi.spyOn(blogService, 'getPage').mockRejectedValue(new AppError('Blog page not found', 404));

    const res = await fetch(`${baseUrl}/api/blog`);
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body.status).toBe('error');
  });
});

describe('PUT /api/blog', () => {
  const validPayload = { title: 'Blog', subtitle: 'Latest', cardFooter: { title: 'F', subtitle: 'FS' } };

  it('returns 200 when authenticated', async () => {
    vi.spyOn(blogService, 'upsertPage').mockResolvedValue({ id: 'blog-1', ...validPayload });

    const res = await fetch(`${baseUrl}/api/blog`, {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify(validPayload),
    });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.status).toBe('success');
  });

  it('returns 401 without token', async () => {
    const res = await fetch(`${baseUrl}/api/blog`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Origin: 'http://trusted.local' },
      body: JSON.stringify(validPayload),
    });

    expect(res.status).toBe(401);
  });
});

// ── Blog posts ────────────────────────────────────────────────────────────────

describe('GET /api/blog/posts', () => {
  it('returns 200 with list of posts', async () => {
    const mockPosts = [
      { id: 'p-1', slug: 'first-post', title: 'First Post', views: 10 },
      { id: 'p-2', slug: 'second-post', title: 'Second Post', views: 5 },
    ];
    vi.spyOn(blogService, 'listPosts').mockResolvedValue(mockPosts);

    const res = await fetch(`${baseUrl}/api/blog/posts`);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.status).toBe('success');
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.data).toHaveLength(2);
    expect(body.data[0].slug).toBe('first-post');
  });

  it('returns empty array when no posts exist', async () => {
    vi.spyOn(blogService, 'listPosts').mockResolvedValue([]);

    const res = await fetch(`${baseUrl}/api/blog/posts`);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data).toEqual([]);
  });
});

describe('POST /api/blog/posts', () => {
  const newPost = {
    slug: 'new-post',
    segment: 'tech',
    title: 'New Post',
    subtitle: 'Subtitle',
    content: 'Content here',
    blogImage: 'https://cdn.example.com/img.jpg',
  };

  it('returns 201 and created post when authenticated', async () => {
    vi.spyOn(blogService, 'createPost').mockResolvedValue({ id: 'p-3', ...newPost, views: 0 });

    const res = await fetch(`${baseUrl}/api/blog/posts`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(newPost),
    });
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.status).toBe('success');
    expect(body.data.slug).toBe('new-post');
    expect(body.data.id).toBe('p-3');
  });

  it('returns 401 without token', async () => {
    const res = await fetch(`${baseUrl}/api/blog/posts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: 'http://trusted.local' },
      body: JSON.stringify(newPost),
    });

    expect(res.status).toBe(401);
  });

  it('returns 400 when service rejects invalid payload', async () => {
    vi.spyOn(blogService, 'createPost').mockRejectedValue(new AppError("Field 'title' is required"));

    const res = await fetch(`${baseUrl}/api/blog/posts`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ slug: 'no-title' }),
    });
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.status).toBe('error');
  });
});

describe('GET /api/blog/posts/:id', () => {
  it('returns 200 with the requested post', async () => {
    const mockPost = { id: 'p-1', slug: 'first-post', title: 'First Post', views: 10 };
    vi.spyOn(blogService, 'getPost').mockResolvedValue(mockPost);

    const res = await fetch(`${baseUrl}/api/blog/posts/p-1`);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.id).toBe('p-1');
    expect(blogService.getPost).toHaveBeenCalledWith('p-1');
  });

  it('returns 404 when post does not exist', async () => {
    vi.spyOn(blogService, 'getPost').mockRejectedValue(new AppError('Post not found', 404));

    const res = await fetch(`${baseUrl}/api/blog/posts/unknown-id`);
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body.status).toBe('error');
  });
});

describe('PUT /api/blog/posts/:id', () => {
  it('returns 200 with updated post when authenticated', async () => {
    const updated = { id: 'p-1', slug: 'first-post', title: 'Updated Title', views: 10 };
    vi.spyOn(blogService, 'updatePost').mockResolvedValue(updated);

    const res = await fetch(`${baseUrl}/api/blog/posts/p-1`, {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify({ title: 'Updated Title' }),
    });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.title).toBe('Updated Title');
    expect(blogService.updatePost).toHaveBeenCalledWith('p-1', expect.objectContaining({ title: 'Updated Title' }));
  });

  it('returns 401 without token', async () => {
    const res = await fetch(`${baseUrl}/api/blog/posts/p-1`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Origin: 'http://trusted.local' },
      body: JSON.stringify({ title: 'Updated' }),
    });

    expect(res.status).toBe(401);
  });
});

describe('DELETE /api/blog/posts/:id', () => {
  it('returns 204 on successful delete when authenticated', async () => {
    vi.spyOn(blogService, 'deletePost').mockResolvedValue(undefined);

    const res = await fetch(`${baseUrl}/api/blog/posts/p-1`, {
      method: 'DELETE',
      headers: authHeaders(),
    });

    expect(res.status).toBe(204);
    expect(blogService.deletePost).toHaveBeenCalledWith('p-1');
  });

  it('returns 401 without token', async () => {
    const res = await fetch(`${baseUrl}/api/blog/posts/p-1`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json', Origin: 'http://trusted.local' },
    });

    expect(res.status).toBe(401);
  });

  it('returns 404 when post does not exist', async () => {
    vi.spyOn(blogService, 'deletePost').mockRejectedValue(new AppError('Post not found', 404));

    const res = await fetch(`${baseUrl}/api/blog/posts/ghost-id`, {
      method: 'DELETE',
      headers: authHeaders(),
    });
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body.status).toBe('error');
  });
});

describe('PATCH /api/blog/posts/:id/views', () => {
  it('returns 200 with incremented view count (requires auth, PATCH is protected)', async () => {
    const updated = { id: 'p-1', views: 11 };
    vi.spyOn(blogService, 'incrementViews').mockResolvedValue(updated);

    const res = await fetch(`${baseUrl}/api/blog/posts/p-1/views`, {
      method: 'PATCH',
      headers: authHeaders(),
    });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.views).toBe(11);
  });

  it('returns 401 without token (PATCH is in PROTECTED_METHODS)', async () => {
    const res = await fetch(`${baseUrl}/api/blog/posts/p-1/views`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Origin: 'http://trusted.local' },
    });

    expect(res.status).toBe(401);
  });
});
