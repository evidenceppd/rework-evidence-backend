'use strict';

const blogService = require('../../src/modules/blog/blog.service');
const blogRepo = require('../../src/modules/blog/blog.repository');

const testimonialsService = require('../../src/modules/testimonials/testimonials.service');
const testimonialsRepo = require('../../src/modules/testimonials/testimonials.repository');
const homeRepo = require('../../src/modules/home/home.repository');

const clientsService = require('../../src/modules/clients/clients.service');
const clientsRepo = require('../../src/modules/clients/clients.repository');

const configService = require('../../src/modules/config/config.service');
const configRepo = require('../../src/modules/config/config.repository');

afterEach(() => {
  vi.restoreAllMocks();
});

describe('services write-path sanitization', () => {
  it('sanitizes blog post payload before create', async () => {
    vi.spyOn(blogRepo, 'findFirst').mockResolvedValue({ id: 'blog-page-1' });
    vi.spyOn(blogRepo, 'findPostBySlug').mockResolvedValue(null);
    const createSpy = vi.spyOn(blogRepo, 'createPost').mockImplementation(async (payload) => payload);

    const result = await blogService.createPost({
      slug: 'post-1',
      segment: '<b>segment</b>',
      title: '<script>alert(1)</script>',
      subtitle: '<img src=x onerror=alert(1)>',
      content: '<h1>Title</h1><script>alert(1)</script>',
      blogImage: 'javascript:alert(1)',
    });

    const payload = createSpy.mock.calls[0][0];

    expect(payload.segment).toBe('&lt;b&gt;segment&lt;/b&gt;');
    expect(payload.title).toBe('&lt;script&gt;alert(1)&lt;/script&gt;');
    expect(payload.subtitle).toBe('&lt;img src=x onerror=alert(1)&gt;');
    expect(payload.content).toBe('&lt;h1&gt;Title&lt;/h1&gt;&lt;script&gt;alert(1)&lt;/script&gt;');
    expect(payload.blogImage).toBe('');
    expect(result.blogImage).toBe('');
  });

  it('sanitizes testimonial payload before create', async () => {
    vi.spyOn(homeRepo, 'findFirst').mockResolvedValue({ id: 'home-1' });
    const createSpy = vi.spyOn(testimonialsRepo, 'createTestimonial').mockImplementation(async (payload) => payload);

    const result = await testimonialsService.create({
      videoLink: 'https://example.com/video',
      description: '<script>alert(1)</script>',
      name: '<b>Alice</b>',
      position: 'CTO <img src=x onerror=alert(1)>',
      clientSince: '2024',
    });

    const payload = createSpy.mock.calls[0][0];

    expect(payload.description).toBe('&lt;script&gt;alert(1)&lt;/script&gt;');
    expect(payload.name).toBe('&lt;b&gt;Alice&lt;/b&gt;');
    expect(payload.position).toBe('CTO &lt;img src=x onerror=alert(1)&gt;');
    expect(result.homePageId).toBe('home-1');
  });

  it('sanitizes site config payload before upsert/create', async () => {
    vi.spyOn(configRepo, 'findFirst').mockResolvedValue(undefined);
    const createSpy = vi.spyOn(configRepo, 'create').mockImplementation(async (payload) => payload);

    const result = await configService.upsert({
      description: '<script>alert(1)</script>',
      cnpj: '00.000.000/0001-00',
      socialMedia: {
        instagram: 'javascript:alert(1)',
        linkedin: 'https://linkedin.com/company/test',
      },
      contactUs: {
        telefone: '(11) 99999-9999',
        email: 'contato@example.com',
        location: '<img src=x onerror=alert(1)>',
      },
    });

    const payload = createSpy.mock.calls[0][0];

    expect(payload.description).toBe('&lt;script&gt;alert(1)&lt;/script&gt;');
    expect(payload.socialMedia.instagram).toBe('');
    expect(payload.socialMedia.linkedin).toBe('https://linkedin.com/company/test');
    expect(payload.contactUs.location).toBe('&lt;img src=x onerror=alert(1)&gt;');
    expect(result.socialMedia.instagram).toBe('');
  });
});

// ─── SVG / data: URI injection tests ─────────────────────────────────────────
//
// data:image/svg+xml URIs can embed <script> tags. Even though sanitizeDeep
// HTML-encodes < and >, browsers decode HTML entities in attribute values
// (e.g. <img src="...">) — so storing the encoded string is insufficient.
// sanitizeUrl() rejects every scheme except http:// and https://, neutralising
// this entire attack class before the value reaches the database.

describe('image URL fields — data: URI / SVG injection (sanitizeUrl)', () => {
  // ── blogImage ──────────────────────────────────────────────────────────────

  it('rejects data:image/svg+xml with embedded <script> as blogImage', async () => {
    vi.spyOn(blogRepo, 'findFirst').mockResolvedValue({ id: 'blog-page-1' });
    vi.spyOn(blogRepo, 'findPostBySlug').mockResolvedValue(null);
    const createSpy = vi.spyOn(blogRepo, 'createPost').mockImplementation(async (payload) => payload);

    const result = await blogService.createPost({
      slug: 'svg-attack',
      segment: 'test',
      title: 'Test',
      subtitle: 'Test',
      content: 'Test',
      blogImage: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>',
    });

    expect(createSpy.mock.calls[0][0].blogImage).toBe('');
    expect(result.blogImage).toBe('');
  });

  it('rejects data:image/svg+xml;base64 encoded SVG with script as blogImage', async () => {
    vi.spyOn(blogRepo, 'findFirst').mockResolvedValue({ id: 'blog-page-1' });
    vi.spyOn(blogRepo, 'findPostBySlug').mockResolvedValue(null);
    const createSpy = vi.spyOn(blogRepo, 'createPost').mockImplementation(async (payload) => payload);

    // base64('<svg><script>alert(1)</script></svg>')
    const maliciousSvg = 'data:image/svg+xml;base64,PHN2Zz48c2NyaXB0PmFsZXJ0KDEpPC9zY3JpcHQ+PC9zdmc+';

    const result = await blogService.createPost({
      slug: 'svg-b64-attack',
      segment: 'test',
      title: 'Test',
      subtitle: 'Test',
      content: 'Test',
      blogImage: maliciousSvg,
    });

    expect(createSpy.mock.calls[0][0].blogImage).toBe('');
    expect(result.blogImage).toBe('');
  });

  it('rejects data:text/html with inline script as blogImage', async () => {
    vi.spyOn(blogRepo, 'findFirst').mockResolvedValue({ id: 'blog-page-1' });
    vi.spyOn(blogRepo, 'findPostBySlug').mockResolvedValue(null);
    const createSpy = vi.spyOn(blogRepo, 'createPost').mockImplementation(async (payload) => payload);

    const result = await blogService.createPost({
      slug: 'html-attack',
      segment: 'test',
      title: 'Test',
      subtitle: 'Test',
      content: 'Test',
      blogImage: 'data:text/html,<script>alert(document.cookie)</script>',
    });

    expect(createSpy.mock.calls[0][0].blogImage).toBe('');
    expect(result.blogImage).toBe('');
  });

  it('accepts a legitimate https image URL as blogImage', async () => {
    vi.spyOn(blogRepo, 'findFirst').mockResolvedValue({ id: 'blog-page-1' });
    vi.spyOn(blogRepo, 'findPostBySlug').mockResolvedValue(null);
    const createSpy = vi.spyOn(blogRepo, 'createPost').mockImplementation(async (payload) => payload);

    await blogService.createPost({
      slug: 'legit-post',
      segment: 'test',
      title: 'Test',
      subtitle: 'Test',
      content: 'Test',
      blogImage: 'https://cdn.example.com/images/hero.jpg',
    });

    expect(createSpy.mock.calls[0][0].blogImage).toBe('https://cdn.example.com/images/hero.jpg');
  });

  // ── clientImage ────────────────────────────────────────────────────────────

  it('rejects data:image/svg+xml with embedded <script> as clientImage', async () => {
    vi.spyOn(clientsRepo, 'findFirst').mockResolvedValue({ id: 'clients-page-1' });
    const createSpy = vi.spyOn(clientsRepo, 'createCompany').mockImplementation(async (payload) => payload);

    const result = await clientsService.createCompany({
      segment: 'tech',
      clientImage: 'data:image/svg+xml,<svg><script>alert(1)</script></svg>',
      clientDescription: 'A great company',
      clientSince: '2024-01-01',
    });

    expect(createSpy.mock.calls[0][0].clientImage).toBe('');
    expect(result.clientImage).toBe('');
  });

  it('accepts a legitimate https image URL as clientImage', async () => {
    vi.spyOn(clientsRepo, 'findFirst').mockResolvedValue({ id: 'clients-page-1' });
    const createSpy = vi.spyOn(clientsRepo, 'createCompany').mockImplementation(async (payload) => payload);

    await clientsService.createCompany({
      segment: 'tech',
      clientImage: 'https://cdn.example.com/logos/company.png',
      clientDescription: 'A great company',
      clientSince: '2024-01-01',
    });

    expect(createSpy.mock.calls[0][0].clientImage).toBe('https://cdn.example.com/logos/company.png');
  });

  // ── videoLink ──────────────────────────────────────────────────────────────

  it('rejects data:text/html as videoLink in testimonials', async () => {
    vi.spyOn(homeRepo, 'findFirst').mockResolvedValue({ id: 'home-1' });
    const createSpy = vi.spyOn(testimonialsRepo, 'createTestimonial').mockImplementation(async (payload) => payload);

    const result = await testimonialsService.create({
      videoLink: 'data:text/html,<script>alert(1)</script>',
      description: 'Great service',
      name: 'Alice',
      position: 'CEO',
      clientSince: '2024',
    });

    expect(createSpy.mock.calls[0][0].videoLink).toBe('');
    expect(result.videoLink).toBe('');
  });

  it('accepts a legitimate https YouTube URL as videoLink', async () => {
    vi.spyOn(homeRepo, 'findFirst').mockResolvedValue({ id: 'home-1' });
    const createSpy = vi.spyOn(testimonialsRepo, 'createTestimonial').mockImplementation(async (payload) => payload);

    await testimonialsService.create({
      videoLink: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      description: 'Great service',
      name: 'Alice',
      position: 'CEO',
      clientSince: '2024',
    });

    expect(createSpy.mock.calls[0][0].videoLink).toBe('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
  });
});


describe('services write-path sanitization', () => {
  it('sanitizes blog post payload before create', async () => {
    vi.spyOn(blogRepo, 'findFirst').mockResolvedValue({ id: 'blog-page-1' });
    vi.spyOn(blogRepo, 'findPostBySlug').mockResolvedValue(null);
    const createSpy = vi.spyOn(blogRepo, 'createPost').mockImplementation(async (payload) => payload);

    const result = await blogService.createPost({
      slug: 'post-1',
      segment: '<b>segment</b>',
      title: '<script>alert(1)</script>',
      subtitle: '<img src=x onerror=alert(1)>',
      content: '<h1>Title</h1><script>alert(1)</script>',
      blogImage: 'javascript:alert(1)',
    });

    const payload = createSpy.mock.calls[0][0];

    expect(payload.segment).toBe('&lt;b&gt;segment&lt;/b&gt;');
    expect(payload.title).toBe('&lt;script&gt;alert(1)&lt;/script&gt;');
    expect(payload.subtitle).toBe('&lt;img src=x onerror=alert(1)&gt;');
    expect(payload.content).toBe('&lt;h1&gt;Title&lt;/h1&gt;&lt;script&gt;alert(1)&lt;/script&gt;');
    expect(payload.blogImage).toBe('');
    expect(result.blogImage).toBe('');
  });

  it('sanitizes testimonial payload before create', async () => {
    vi.spyOn(homeRepo, 'findFirst').mockResolvedValue({ id: 'home-1' });
    const createSpy = vi.spyOn(testimonialsRepo, 'createTestimonial').mockImplementation(async (payload) => payload);

    const result = await testimonialsService.create({
      videoLink: 'https://example.com/video',
      description: '<script>alert(1)</script>',
      name: '<b>Alice</b>',
      position: 'CTO <img src=x onerror=alert(1)>',
      clientSince: '2024',
    });

    const payload = createSpy.mock.calls[0][0];

    expect(payload.description).toBe('&lt;script&gt;alert(1)&lt;/script&gt;');
    expect(payload.name).toBe('&lt;b&gt;Alice&lt;/b&gt;');
    expect(payload.position).toBe('CTO &lt;img src=x onerror=alert(1)&gt;');
    expect(result.homePageId).toBe('home-1');
  });

  it('sanitizes site config payload before upsert/create', async () => {
    vi.spyOn(configRepo, 'findFirst').mockResolvedValue(undefined);
    const createSpy = vi.spyOn(configRepo, 'create').mockImplementation(async (payload) => payload);

    const result = await configService.upsert({
      description: '<script>alert(1)</script>',
      cnpj: '00.000.000/0001-00',
      socialMedia: {
        instagram: 'javascript:alert(1)',
        linkedin: 'https://linkedin.com/company/test',
      },
      contactUs: {
        telefone: '(11) 99999-9999',
        email: 'contato@example.com',
        location: '<img src=x onerror=alert(1)>',
      },
    });

    const payload = createSpy.mock.calls[0][0];

    expect(payload.description).toBe('&lt;script&gt;alert(1)&lt;/script&gt;');
    expect(payload.socialMedia.instagram).toBe('');
    expect(payload.socialMedia.linkedin).toBe('https://linkedin.com/company/test');
    expect(payload.contactUs.location).toBe('&lt;img src=x onerror=alert(1)&gt;');
    expect(result.socialMedia.instagram).toBe('');
  });
});
