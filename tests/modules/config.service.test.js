'use strict';

const configService = require('../../src/modules/config/config.service');
const repo = require('../../src/modules/config/config.repository');

afterEach(() => {
  vi.restoreAllMocks();
});

const VALID_PAYLOAD = {
  description: 'Site description',
  cnpj: '00.000.000/0001-00',
  socialMedia: {
    instagram: 'https://instagram.com/test',
    linkedin: 'https://linkedin.com/company/test',
  },
  contactUs: {
    telefone: '(11) 99999-9999',
    email: 'contato@example.com',
    location: 'São Paulo, SP',
  },
};

describe('configService.get', () => {
  it('returns site config when found', async () => {
    const config = { id: 'cfg-1', ...VALID_PAYLOAD };
    vi.spyOn(repo, 'findFirst').mockResolvedValue(config);

    const result = await configService.get();

    expect(result).toBe(config);
  });

  it('throws 404 when config does not exist', async () => {
    vi.spyOn(repo, 'findFirst').mockResolvedValue(null);

    await expect(configService.get()).rejects.toMatchObject({
      status: 404,
      message: 'Site config not found',
    });
  });
});

describe('configService.upsert', () => {
  it('creates config when none exists', async () => {
    vi.spyOn(repo, 'findFirst').mockResolvedValue(undefined);
    const createSpy = vi.spyOn(repo, 'create').mockResolvedValue({ id: 'cfg-1' });

    await configService.upsert(VALID_PAYLOAD);

    expect(createSpy).toHaveBeenCalledOnce();
  });

  it('updates config when one already exists', async () => {
    vi.spyOn(repo, 'findFirst').mockResolvedValue({ id: 'cfg-1' });
    const updateSpy = vi.spyOn(repo, 'update').mockResolvedValue({ id: 'cfg-1' });

    await configService.upsert(VALID_PAYLOAD);

    expect(updateSpy).toHaveBeenCalledWith('cfg-1', expect.any(Object));
  });

  it('throws 400 when a required field is missing', async () => {
    vi.spyOn(repo, 'findFirst').mockResolvedValue(null);
    const { description, ...incomplete } = VALID_PAYLOAD;

    await expect(configService.upsert(incomplete)).rejects.toMatchObject({
      status: 400,
      message: "Field 'description' is required",
    });
  });

  it('sanitizes XSS in config payload', async () => {
    vi.spyOn(repo, 'findFirst').mockResolvedValue(undefined);
    const createSpy = vi.spyOn(repo, 'create').mockResolvedValue({ id: 'cfg-1' });

    await configService.upsert({ ...VALID_PAYLOAD, description: '<script>xss</script>' });

    const payload = createSpy.mock.calls[0][0];
    expect(payload.description).toBe('&lt;script&gt;xss&lt;/script&gt;');
  });

  it('strips javascript: URLs from socialMedia fields', async () => {
    vi.spyOn(repo, 'findFirst').mockResolvedValue(undefined);
    const createSpy = vi.spyOn(repo, 'create').mockResolvedValue({ id: 'cfg-1' });

    await configService.upsert({
      ...VALID_PAYLOAD,
      socialMedia: {
        instagram: 'javascript:alert(1)',
        linkedin: 'https://linkedin.com/company/test',
      },
    });

    const payload = createSpy.mock.calls[0][0];
    expect(payload.socialMedia.instagram).toBe('');
    expect(payload.socialMedia.linkedin).toBe('https://linkedin.com/company/test');
  });
});
