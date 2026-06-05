'use strict';

const testimonialsService = require('../../src/modules/testimonials/testimonials.service');
const repo = require('../../src/modules/testimonials/testimonials.repository');
const homeRepo = require('../../src/modules/home/home.repository');

afterEach(() => {
  vi.restoreAllMocks();
});

const VALID_PAGE = {
  title: 'Testimonials',
  subtitle: 'Sub',
  informative: [{ label: 'Experience', value: '10+ years' }],
  cardFooter: 'Footer',
};

const VALID_TESTIMONIAL = {
  videoLink: 'https://example.com/video',
  description: 'Great service',
  name: 'Alice',
  position: 'CTO',
  clientSince: '2022',
};

// ─── get ──────────────────────────────────────────────────────────────────────

describe('testimonialsService.get', () => {
  it('returns testimonials page when found', async () => {
    const page = { id: 'tp-1', ...VALID_PAGE };
    vi.spyOn(repo, 'findFirst').mockResolvedValue(page);

    const result = await testimonialsService.get();

    expect(result).toBe(page);
  });

  it('throws 404 when testimonials page does not exist', async () => {
    vi.spyOn(repo, 'findFirst').mockResolvedValue(null);

    await expect(testimonialsService.get()).rejects.toMatchObject({ status: 404 });
  });
});

// ─── upsert ───────────────────────────────────────────────────────────────────

describe('testimonialsService.upsert', () => {
  it('upserts testimonials page when home exists', async () => {
    vi.spyOn(homeRepo, 'findFirst').mockResolvedValue({ id: 'home-1' });
    vi.spyOn(repo, 'findFirst').mockResolvedValue(null);
    const upsertSpy = vi.spyOn(repo, 'upsert').mockResolvedValue({ id: 'tp-1' });

    await testimonialsService.upsert(VALID_PAGE);

    expect(upsertSpy).toHaveBeenCalledWith('home-1', expect.objectContaining({ title: 'Testimonials' }));
  });

  it('throws 400 when a required field is missing', async () => {
    vi.spyOn(homeRepo, 'findFirst').mockResolvedValue({ id: 'home-1' });
    vi.spyOn(repo, 'findFirst').mockResolvedValue(null);
    const { title, ...incomplete } = VALID_PAGE;

    await expect(testimonialsService.upsert(incomplete)).rejects.toMatchObject({ status: 400 });
  });

  it('throws 400 when informative is not an array', async () => {
    vi.spyOn(homeRepo, 'findFirst').mockResolvedValue({ id: 'home-1' });
    vi.spyOn(repo, 'findFirst').mockResolvedValue(null);
    await expect(
      testimonialsService.upsert({ ...VALID_PAGE, informative: 'not-array' }),
    ).rejects.toMatchObject({ status: 400, message: "Field 'informative' must be an array" });
  });

  it('throws when home page does not exist', async () => {
    vi.spyOn(homeRepo, 'findFirst').mockResolvedValue(null);

    await expect(testimonialsService.upsert(VALID_PAGE)).rejects.toMatchObject({ status: 400 });
  });
});

// ─── list ─────────────────────────────────────────────────────────────────────

describe('testimonialsService.list', () => {
  it('returns testimonials when home page exists', async () => {
    const items = [{ id: 't-1', name: 'Alice' }];
    vi.spyOn(homeRepo, 'findFirst').mockResolvedValue({ id: 'home-1' });
    vi.spyOn(repo, 'findAllByHome').mockResolvedValue(items);

    const result = await testimonialsService.list();

    expect(result).toBe(items);
  });

  it('throws when home page does not exist', async () => {
    vi.spyOn(homeRepo, 'findFirst').mockResolvedValue(null);

    await expect(testimonialsService.list()).rejects.toMatchObject({ status: 400 });
  });
});

// ─── getOne ───────────────────────────────────────────────────────────────────

describe('testimonialsService.getOne', () => {
  it('returns a testimonial by id', async () => {
    const t = { id: 't-1', name: 'Alice' };
    vi.spyOn(repo, 'findById').mockResolvedValue(t);

    const result = await testimonialsService.getOne('t-1');

    expect(result).toBe(t);
  });

  it('throws 404 when testimonial not found', async () => {
    vi.spyOn(repo, 'findById').mockResolvedValue(null);

    await expect(testimonialsService.getOne('missing')).rejects.toMatchObject({ status: 404 });
  });
});

// ─── create ───────────────────────────────────────────────────────────────────

describe('testimonialsService.create', () => {
  it('creates a testimonial when all fields are provided', async () => {
    vi.spyOn(homeRepo, 'findFirst').mockResolvedValue({ id: 'home-1' });
    const createSpy = vi.spyOn(repo, 'createTestimonial').mockResolvedValue({ id: 't-new' });

    await testimonialsService.create(VALID_TESTIMONIAL);

    expect(createSpy).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Alice', homePageId: 'home-1' }),
    );
  });

  it('throws 400 when a required field is missing', async () => {
    const { name, ...incomplete } = VALID_TESTIMONIAL;

    await expect(testimonialsService.create(incomplete)).rejects.toMatchObject({ status: 400 });
  });

  it('sanitizes XSS in testimonial payload', async () => {
    vi.spyOn(homeRepo, 'findFirst').mockResolvedValue({ id: 'home-1' });
    const createSpy = vi.spyOn(repo, 'createTestimonial').mockResolvedValue({ id: 't-new' });

    await testimonialsService.create({ ...VALID_TESTIMONIAL, description: '<script>xss</script>' });

    const payload = createSpy.mock.calls[0][0];
    expect(payload.description).toBe('&lt;script&gt;xss&lt;/script&gt;');
  });
});

// ─── update ───────────────────────────────────────────────────────────────────

describe('testimonialsService.update', () => {
  it('updates a testimonial', async () => {
    vi.spyOn(repo, 'findById').mockResolvedValue({ id: 't-1' });
    const updateSpy = vi.spyOn(repo, 'updateTestimonial').mockResolvedValue({ id: 't-1' });

    await testimonialsService.update('t-1', { name: 'Bob' });

    expect(updateSpy).toHaveBeenCalledWith('t-1', expect.objectContaining({ name: 'Bob' }));
  });

  it('throws 404 when testimonial not found', async () => {
    vi.spyOn(repo, 'findById').mockResolvedValue(null);

    await expect(testimonialsService.update('missing', { name: 'X' })).rejects.toMatchObject({ status: 404 });
  });
});

// ─── remove ───────────────────────────────────────────────────────────────────

describe('testimonialsService.remove', () => {
  it('deletes a testimonial', async () => {
    vi.spyOn(repo, 'findById').mockResolvedValue({ id: 't-1' });
    const deleteSpy = vi.spyOn(repo, 'deleteTestimonial').mockResolvedValue(undefined);

    await testimonialsService.remove('t-1');

    expect(deleteSpy).toHaveBeenCalledWith('t-1');
  });

  it('throws 404 when testimonial not found', async () => {
    vi.spyOn(repo, 'findById').mockResolvedValue(null);

    await expect(testimonialsService.remove('missing')).rejects.toMatchObject({ status: 404 });
  });
});
