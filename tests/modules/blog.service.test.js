'use strict';

const blogService = require('../../src/modules/blog/blog.service');
const repo = require('../../src/modules/blog/blog.repository');
const homeRepo = require('../../src/modules/home/home.repository');

afterEach(() => {
  vi.restoreAllMocks();
});

const VALID_PAGE = { title: 'Blog', subtitle: 'Sub', cardFooter: 'Footer' };
const VALID_POST = {
  slug: 'post-1',
  segment: 'Tech',
  title: 'Title',
  subtitle: 'Subtitle',
  content: '<p>Content</p>',
  blogImage: '/img/post.webp',
};

// ─── getPage ──────────────────────────────────────────────────────────────────

describe('blogService.getPage', () => {
  it('returns the blog page when found', async () => {
    const page = { id: 'bp-1', ...VALID_PAGE };
    vi.spyOn(repo, 'findFirst').mockResolvedValue(page);

    const result = await blogService.getPage();

    expect(result).toBe(page);
  });

  it('throws 404 when blog page does not exist', async () => {
    vi.spyOn(repo, 'findFirst').mockResolvedValue(null);

    await expect(blogService.getPage()).rejects.toMatchObject({ status: 404 });
  });
});

// ─── upsertPage ───────────────────────────────────────────────────────────────

describe('blogService.upsertPage', () => {
  it('upserts the blog page when home exists', async () => {
    vi.spyOn(homeRepo, 'findFirst').mockResolvedValue({ id: 'home-1' });
    vi.spyOn(repo, 'findFirst').mockResolvedValue(null);
    const upsertSpy = vi.spyOn(repo, 'upsertPage').mockResolvedValue({ id: 'bp-1' });

    await blogService.upsertPage(VALID_PAGE);

    expect(upsertSpy).toHaveBeenCalledWith('home-1', expect.objectContaining({ title: 'Blog' }));
  });

  it('throws 400 when a required field is missing', async () => {
    vi.spyOn(homeRepo, 'findFirst').mockResolvedValue({ id: 'home-1' });
    vi.spyOn(repo, 'findFirst').mockResolvedValue(null);
    const { title, ...incomplete } = VALID_PAGE;

    await expect(blogService.upsertPage(incomplete)).rejects.toMatchObject({ status: 400 });
  });

  it('throws when home page does not exist', async () => {
    vi.spyOn(homeRepo, 'findFirst').mockResolvedValue(null);

    await expect(blogService.upsertPage(VALID_PAGE)).rejects.toMatchObject({ status: 400 });
  });
});

// ─── listPosts ────────────────────────────────────────────────────────────────

describe('blogService.listPosts', () => {
  it('returns all posts when blog page exists', async () => {
    const posts = [{ id: 'p-1', title: 'Post 1' }];
    vi.spyOn(repo, 'findFirst').mockResolvedValue({ id: 'bp-1' });
    vi.spyOn(repo, 'findAllPosts').mockResolvedValue(posts);

    const result = await blogService.listPosts();

    expect(result).toBe(posts);
  });

  it('throws 404 when blog page does not exist', async () => {
    vi.spyOn(repo, 'findFirst').mockResolvedValue(null);

    await expect(blogService.listPosts()).rejects.toMatchObject({ status: 404 });
  });
});

// ─── getPost ──────────────────────────────────────────────────────────────────

describe('blogService.getPost', () => {
  it('returns a post by id', async () => {
    const post = { id: 'p-1', ...VALID_POST };
    vi.spyOn(repo, 'findPostById').mockResolvedValue(post);

    const result = await blogService.getPost('p-1');

    expect(result).toBe(post);
  });

  it('throws 404 when post is not found', async () => {
    vi.spyOn(repo, 'findPostById').mockResolvedValue(null);

    await expect(blogService.getPost('missing')).rejects.toMatchObject({ status: 404 });
  });
});

// ─── createPost ───────────────────────────────────────────────────────────────

describe('blogService.createPost', () => {
  it('creates a post when all required fields are provided', async () => {
    vi.spyOn(repo, 'findFirst').mockResolvedValue({ id: 'bp-1' });
    vi.spyOn(repo, 'findPostBySlug').mockResolvedValue(null);
    const createSpy = vi.spyOn(repo, 'createPost').mockResolvedValue({ id: 'new-post' });

    await blogService.createPost(VALID_POST);

    expect(createSpy).toHaveBeenCalledWith(
      expect.objectContaining({ slug: 'post-1', title: 'Title' }),
    );
  });

  it('throws 400 when a required field is missing', async () => {
    const { slug, ...incomplete } = VALID_POST;

    await expect(blogService.createPost(incomplete)).rejects.toMatchObject({ status: 400 });
  });

  it('throws 400 when slug is already in use', async () => {
    vi.spyOn(repo, 'findFirst').mockResolvedValue({ id: 'bp-1' });
    vi.spyOn(repo, 'findPostBySlug').mockResolvedValue({ id: 'existing' });

    await expect(blogService.createPost(VALID_POST)).rejects.toMatchObject({
      status: 400,
      message: "Slug 'post-1' is already in use",
    });
  });

  it('throws when blog page does not exist', async () => {
    vi.spyOn(repo, 'findFirst').mockResolvedValue(null);

    await expect(blogService.createPost(VALID_POST)).rejects.toMatchObject({ status: 400 });
  });

  it('sanitizes XSS in post payload', async () => {
    vi.spyOn(repo, 'findFirst').mockResolvedValue({ id: 'bp-1' });
    vi.spyOn(repo, 'findPostBySlug').mockResolvedValue(null);
    const createSpy = vi.spyOn(repo, 'createPost').mockResolvedValue({ id: 'new-post' });

    await blogService.createPost({ ...VALID_POST, title: '<script>xss</script>' });

    const payload = createSpy.mock.calls[0][0];
    expect(payload.title).toBe('&lt;script&gt;xss&lt;/script&gt;');
  });
});

// ─── updatePost ───────────────────────────────────────────────────────────────

describe('blogService.updatePost', () => {
  it('updates a post', async () => {
    vi.spyOn(repo, 'findPostById').mockResolvedValue({ id: 'p-1', slug: 'post-1' });
    const updateSpy = vi.spyOn(repo, 'updatePost').mockResolvedValue({ id: 'p-1' });

    await blogService.updatePost('p-1', { title: 'New Title' });

    expect(updateSpy).toHaveBeenCalledWith('p-1', expect.objectContaining({ title: 'New Title' }));
  });

  it('throws 400 when new slug is already taken by another post', async () => {
    vi.spyOn(repo, 'findPostById').mockResolvedValue({ id: 'p-1', slug: 'old-slug' });
    vi.spyOn(repo, 'findPostBySlug').mockResolvedValue({ id: 'p-other' });

    await expect(blogService.updatePost('p-1', { slug: 'taken-slug' })).rejects.toMatchObject({
      status: 400,
    });
  });

  it('allows updating to the same slug (no slug conflict)', async () => {
    vi.spyOn(repo, 'findPostById').mockResolvedValue({ id: 'p-1', slug: 'my-slug' });
    const updateSpy = vi.spyOn(repo, 'updatePost').mockResolvedValue({ id: 'p-1' });

    await blogService.updatePost('p-1', { slug: 'my-slug', title: 'Updated' });

    expect(updateSpy).toHaveBeenCalledOnce();
  });

  it('throws 404 when post to update is not found', async () => {
    vi.spyOn(repo, 'findPostById').mockResolvedValue(null);

    await expect(blogService.updatePost('missing', { title: 'X' })).rejects.toMatchObject({ status: 404 });
  });
});

// ─── deletePost ───────────────────────────────────────────────────────────────

describe('blogService.deletePost', () => {
  it('deletes a post that exists', async () => {
    vi.spyOn(repo, 'findPostById').mockResolvedValue({ id: 'p-1' });
    const deleteSpy = vi.spyOn(repo, 'deletePost').mockResolvedValue(undefined);

    await blogService.deletePost('p-1');

    expect(deleteSpy).toHaveBeenCalledWith('p-1');
  });

  it('throws 404 when post to delete is not found', async () => {
    vi.spyOn(repo, 'findPostById').mockResolvedValue(null);

    await expect(blogService.deletePost('missing')).rejects.toMatchObject({ status: 404 });
  });
});

// ─── incrementViews ───────────────────────────────────────────────────────────

describe('blogService.incrementViews', () => {
  it('increments view count for existing post', async () => {
    vi.spyOn(repo, 'findPostById').mockResolvedValue({ id: 'p-1' });
    const incrementSpy = vi.spyOn(repo, 'incrementViews').mockResolvedValue({ id: 'p-1', views: 2 });

    await blogService.incrementViews('p-1');

    expect(incrementSpy).toHaveBeenCalledWith('p-1');
  });

  it('throws 404 when post is not found', async () => {
    vi.spyOn(repo, 'findPostById').mockResolvedValue(null);

    await expect(blogService.incrementViews('missing')).rejects.toMatchObject({ status: 404 });
  });
});
