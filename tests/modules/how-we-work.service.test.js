'use strict';

const howWeWorkService = require('../../src/modules/how-we-work/how-we-work.service');
const repo = require('../../src/modules/how-we-work/how-we-work.repository');

afterEach(() => {
  vi.restoreAllMocks();
});

const VALID_PAYLOAD = {
  aboutUs: {
    objectives: ['Objective 1', 'Objective 2'],
    card_image: ['/img/1.png', '/img/2.png'],
    description: 'About us description',
  },
  howWeWork: {
    processes: ['Process 1', 'Process 2'],
    description: 'How we work description',
  },
  oursValues: 'Our values text',
  cardFooter: 'Footer text',
};

describe('howWeWorkService.get', () => {
  it('returns the how-we-work page when found', async () => {
    const page = { id: 'hww-1', ...VALID_PAYLOAD };
    vi.spyOn(repo, 'findFirst').mockResolvedValue(page);

    const result = await howWeWorkService.get();

    expect(result).toBe(page);
  });

  it('throws 404 when page does not exist', async () => {
    vi.spyOn(repo, 'findFirst').mockResolvedValue(null);

    await expect(howWeWorkService.get()).rejects.toMatchObject({
      status: 404,
      message: 'How we work page not found',
    });
  });
});

describe('howWeWorkService.upsert', () => {
  it('creates the page when none exists', async () => {
    vi.spyOn(repo, 'findFirst').mockResolvedValue(null);
    const createSpy = vi.spyOn(repo, 'create').mockResolvedValue({ id: 'hww-1' });

    await howWeWorkService.upsert(VALID_PAYLOAD);

    expect(createSpy).toHaveBeenCalledOnce();
  });

  it('updates the page when one already exists', async () => {
    vi.spyOn(repo, 'findFirst').mockResolvedValue({ id: 'hww-1' });
    const updateSpy = vi.spyOn(repo, 'update').mockResolvedValue({ id: 'hww-1' });

    await howWeWorkService.upsert(VALID_PAYLOAD);

    expect(updateSpy).toHaveBeenCalledWith('hww-1', expect.any(Object));
  });

  it('throws 400 when a required field is missing', async () => {
    vi.spyOn(repo, 'findFirst').mockResolvedValue(null);
    const { aboutUs, ...incomplete } = VALID_PAYLOAD;

    await expect(howWeWorkService.upsert(incomplete)).rejects.toMatchObject({ status: 400 });
  });

  it('throws 400 when aboutUs.objectives is not an array', async () => {
    vi.spyOn(repo, 'findFirst').mockResolvedValue(null);
    const invalid = {
      ...VALID_PAYLOAD,
      aboutUs: { ...VALID_PAYLOAD.aboutUs, objectives: 'not-array' },
    };

    await expect(howWeWorkService.upsert(invalid)).rejects.toMatchObject({
      status: 400,
      message: "Field 'aboutUs.objectives' must be an array",
    });
  });

  it('throws 400 when aboutUs.card_image is not an array', async () => {
    vi.spyOn(repo, 'findFirst').mockResolvedValue(null);
    const invalid = {
      ...VALID_PAYLOAD,
      aboutUs: { ...VALID_PAYLOAD.aboutUs, card_image: 'not-array' },
    };

    await expect(howWeWorkService.upsert(invalid)).rejects.toMatchObject({
      status: 400,
      message: "Field 'aboutUs.card_image' must be an array",
    });
  });

  it('throws 400 when howWeWork.processes is not an array', async () => {
    vi.spyOn(repo, 'findFirst').mockResolvedValue(null);
    const invalid = {
      ...VALID_PAYLOAD,
      howWeWork: { ...VALID_PAYLOAD.howWeWork, processes: 'not-array' },
    };

    await expect(howWeWorkService.upsert(invalid)).rejects.toMatchObject({
      status: 400,
      message: "Field 'howWeWork.processes' must be an array",
    });
  });

  it('sanitizes XSS in payload', async () => {
    vi.spyOn(repo, 'findFirst').mockResolvedValue(null);
    const createSpy = vi.spyOn(repo, 'create').mockResolvedValue({ id: 'hww-1' });

    await howWeWorkService.upsert({ ...VALID_PAYLOAD, oursValues: '<script>xss</script>' });

    const payload = createSpy.mock.calls[0][0];
    expect(payload.oursValues).toBe('&lt;script&gt;xss&lt;/script&gt;');
  });
});
