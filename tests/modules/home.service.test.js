'use strict';

const homeService = require('../../src/modules/home/home.service');
const repo = require('../../src/modules/home/home.repository');

afterEach(() => {
  vi.restoreAllMocks();
});

const VALID_PAYLOAD = {
  bannerHome: 'Banner text',
  scenario: 'Scenario text',
  bottlenecks: ['b1', 'b2'],
  performance: 'Performance text',
  howWeWork: ['step1'],
  blogSectionTitle: 'Blog title',
  cardFooter: 'Footer text',
};

describe('homeService.get', () => {
  it('returns the home page when found', async () => {
    const page = { id: 'home-1', ...VALID_PAYLOAD };
    vi.spyOn(repo, 'findFirst').mockResolvedValue(page);

    const result = await homeService.get();

    expect(result).toBe(page);
  });

  it('throws 404 when home page does not exist', async () => {
    vi.spyOn(repo, 'findFirst').mockResolvedValue(null);

    await expect(homeService.get()).rejects.toMatchObject({
      status: 404,
      message: 'Home page not found',
    });
  });
});

describe('homeService.upsert', () => {
  it('creates home page when none exists', async () => {
    vi.spyOn(repo, 'findFirst').mockResolvedValue(null);
    const createSpy = vi.spyOn(repo, 'create').mockResolvedValue({ id: 'home-1' });
    const updateSpy = vi.spyOn(repo, 'update').mockResolvedValue({ id: 'home-1' });

    await homeService.upsert(VALID_PAYLOAD);

    expect(createSpy).toHaveBeenCalledOnce();
    expect(updateSpy).not.toHaveBeenCalled();
  });

  it('updates home page when one already exists', async () => {
    vi.spyOn(repo, 'findFirst').mockResolvedValue({ id: 'home-1' });
    const updateSpy = vi.spyOn(repo, 'update').mockResolvedValue({ id: 'home-1' });

    await homeService.upsert(VALID_PAYLOAD);

    expect(updateSpy).toHaveBeenCalledWith('home-1', expect.any(Object));
  });

  it('throws 400 when a required field is missing', async () => {
    vi.spyOn(repo, 'findFirst').mockResolvedValue(null);
    const { bannerHome, ...incomplete } = VALID_PAYLOAD;

    await expect(homeService.upsert(incomplete)).rejects.toMatchObject({
      status: 400,
      message: "Field 'bannerHome' is required",
    });
  });

  it('throws 400 when bottlenecks is not an array', async () => {
    vi.spyOn(repo, 'findFirst').mockResolvedValue(null);
    await expect(
      homeService.upsert({ ...VALID_PAYLOAD, bottlenecks: 'not-an-array' }),
    ).rejects.toMatchObject({ status: 400, message: "Field 'bottlenecks' must be an array" });
  });

  it('throws 400 when howWeWork is not an array', async () => {
    vi.spyOn(repo, 'findFirst').mockResolvedValue(null);
    await expect(
      homeService.upsert({ ...VALID_PAYLOAD, howWeWork: 'string-value' }),
    ).rejects.toMatchObject({ status: 400, message: "Field 'howWeWork' must be an array" });
  });

  it('sanitizes XSS payload before saving', async () => {
    vi.spyOn(repo, 'findFirst').mockResolvedValue(null);
    const createSpy = vi.spyOn(repo, 'create').mockResolvedValue({ id: 'home-1' });

    await homeService.upsert({
      ...VALID_PAYLOAD,
      bannerHome: '<script>alert(1)</script>',
    });

    const payload = createSpy.mock.calls[0][0];
    expect(payload.bannerHome).toBe('&lt;script&gt;alert(1)&lt;/script&gt;');
  });
});
