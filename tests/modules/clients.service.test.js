'use strict';

const clientsService = require('../../src/modules/clients/clients.service');
const repo = require('../../src/modules/clients/clients.repository');
const homeRepo = require('../../src/modules/home/home.repository');

afterEach(() => {
  vi.restoreAllMocks();
});

const VALID_PAGE = {
  title: 'Clients',
  subtitle: 'Sub',
  cardsClients: [{ name: 'ACME' }],
  cardFooter: 'Footer',
};

const VALID_COMPANY = {
  segment: 'Tech',
  clientImage: '/img/company.png',
  clientDescription: 'A great company',
  clientSince: '2020-01-01T00:00:00.000Z',
};

// ─── getPage ──────────────────────────────────────────────────────────────────

describe('clientsService.getPage', () => {
  it('returns the clients page when found', async () => {
    const page = { id: 'cp-1', ...VALID_PAGE };
    vi.spyOn(repo, 'findFirst').mockResolvedValue(page);

    const result = await clientsService.getPage();

    expect(result).toBe(page);
  });

  it('throws 404 when page does not exist', async () => {
    vi.spyOn(repo, 'findFirst').mockResolvedValue(null);

    await expect(clientsService.getPage()).rejects.toMatchObject({ status: 404 });
  });
});

// ─── upsertPage ───────────────────────────────────────────────────────────────

describe('clientsService.upsertPage', () => {
  it('upserts page when home exists', async () => {
    vi.spyOn(homeRepo, 'findFirst').mockResolvedValue({ id: 'home-1' });
    vi.spyOn(repo, 'findFirst').mockResolvedValue(null);
    const upsertSpy = vi.spyOn(repo, 'upsertPage').mockResolvedValue({ id: 'cp-1' });

    await clientsService.upsertPage(VALID_PAGE);

    expect(upsertSpy).toHaveBeenCalledWith('home-1', expect.objectContaining({ title: 'Clients' }));
  });

  it('throws 400 when a required field is missing', async () => {
    vi.spyOn(homeRepo, 'findFirst').mockResolvedValue({ id: 'home-1' });
    vi.spyOn(repo, 'findFirst').mockResolvedValue(null);
    const { title, ...incomplete } = VALID_PAGE;

    await expect(clientsService.upsertPage(incomplete)).rejects.toMatchObject({ status: 400 });
  });

  it('throws 400 when cardsClients is not an array', async () => {
    vi.spyOn(homeRepo, 'findFirst').mockResolvedValue({ id: 'home-1' });
    vi.spyOn(repo, 'findFirst').mockResolvedValue(null);
    await expect(
      clientsService.upsertPage({ ...VALID_PAGE, cardsClients: 'not-array' }),
    ).rejects.toMatchObject({ status: 400, message: "Field 'cardsClients' must be an array" });
  });

  it('throws when home page does not exist', async () => {
    vi.spyOn(homeRepo, 'findFirst').mockResolvedValue(null);

    await expect(clientsService.upsertPage(VALID_PAGE)).rejects.toMatchObject({ status: 400 });
  });
});

// ─── listCompanies ────────────────────────────────────────────────────────────

describe('clientsService.listCompanies', () => {
  it('returns companies when page exists', async () => {
    const companies = [{ id: 'co-1', segment: 'Tech' }];
    vi.spyOn(repo, 'findFirst').mockResolvedValue({ id: 'cp-1' });
    vi.spyOn(repo, 'findAllCompanies').mockResolvedValue(companies);

    const result = await clientsService.listCompanies();

    expect(result).toBe(companies);
  });

  it('throws 404 when page does not exist', async () => {
    vi.spyOn(repo, 'findFirst').mockResolvedValue(null);

    await expect(clientsService.listCompanies()).rejects.toMatchObject({ status: 404 });
  });
});

// ─── getCompany ───────────────────────────────────────────────────────────────

describe('clientsService.getCompany', () => {
  it('returns a company by id', async () => {
    const company = { id: 'co-1', ...VALID_COMPANY };
    vi.spyOn(repo, 'findCompanyById').mockResolvedValue(company);

    const result = await clientsService.getCompany('co-1');

    expect(result).toBe(company);
  });

  it('throws 404 when company not found', async () => {
    vi.spyOn(repo, 'findCompanyById').mockResolvedValue(null);

    await expect(clientsService.getCompany('missing')).rejects.toMatchObject({ status: 404 });
  });
});

// ─── createCompany ────────────────────────────────────────────────────────────

describe('clientsService.createCompany', () => {
  it('creates a company when page exists', async () => {
    vi.spyOn(repo, 'findFirst').mockResolvedValue({ id: 'cp-1' });
    const createSpy = vi.spyOn(repo, 'createCompany').mockResolvedValue({ id: 'co-new' });

    await clientsService.createCompany(VALID_COMPANY);

    expect(createSpy).toHaveBeenCalledWith(
      expect.objectContaining({ segment: 'Tech', clientsPageId: 'cp-1' }),
    );
  });

  it('throws 400 when a required field is missing', async () => {
    const { segment, ...incomplete } = VALID_COMPANY;

    await expect(clientsService.createCompany(incomplete)).rejects.toMatchObject({ status: 400 });
  });

  it('throws when page does not exist', async () => {
    vi.spyOn(repo, 'findFirst').mockResolvedValue(null);

    await expect(clientsService.createCompany(VALID_COMPANY)).rejects.toMatchObject({ status: 400 });
  });

  it('converts clientSince string to Date object', async () => {
    vi.spyOn(repo, 'findFirst').mockResolvedValue({ id: 'cp-1' });
    const createSpy = vi.spyOn(repo, 'createCompany').mockResolvedValue({ id: 'co-new' });

    await clientsService.createCompany(VALID_COMPANY);

    const payload = createSpy.mock.calls[0][0];
    expect(payload.clientSince).toBeInstanceOf(Date);
  });
});

// ─── updateCompany ────────────────────────────────────────────────────────────

describe('clientsService.updateCompany', () => {
  it('updates a company', async () => {
    vi.spyOn(repo, 'findCompanyById').mockResolvedValue({ id: 'co-1' });
    const updateSpy = vi.spyOn(repo, 'updateCompany').mockResolvedValue({ id: 'co-1' });

    await clientsService.updateCompany('co-1', { segment: 'Finance' });

    expect(updateSpy).toHaveBeenCalledWith('co-1', expect.objectContaining({ segment: 'Finance' }));
  });

  it('converts clientSince to Date when updating', async () => {
    vi.spyOn(repo, 'findCompanyById').mockResolvedValue({ id: 'co-1' });
    const updateSpy = vi.spyOn(repo, 'updateCompany').mockResolvedValue({ id: 'co-1' });

    await clientsService.updateCompany('co-1', { clientSince: '2023-06-01T00:00:00.000Z' });

    const payload = updateSpy.mock.calls[0][1];
    expect(payload.clientSince).toBeInstanceOf(Date);
  });

  it('throws 404 when company not found', async () => {
    vi.spyOn(repo, 'findCompanyById').mockResolvedValue(null);

    await expect(clientsService.updateCompany('missing', { segment: 'X' })).rejects.toMatchObject({ status: 404 });
  });
});

// ─── deleteCompany ────────────────────────────────────────────────────────────

describe('clientsService.deleteCompany', () => {
  it('deletes a company that exists', async () => {
    vi.spyOn(repo, 'findCompanyById').mockResolvedValue({ id: 'co-1' });
    const deleteSpy = vi.spyOn(repo, 'deleteCompany').mockResolvedValue(undefined);

    await clientsService.deleteCompany('co-1');

    expect(deleteSpy).toHaveBeenCalledWith('co-1');
  });

  it('throws 404 when company to delete is not found', async () => {
    vi.spyOn(repo, 'findCompanyById').mockResolvedValue(null);

    await expect(clientsService.deleteCompany('missing')).rejects.toMatchObject({ status: 404 });
  });
});
