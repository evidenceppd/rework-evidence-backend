'use strict';

const servicesService = require('../../src/modules/services/services.service');
const repo = require('../../src/modules/services/services.repository');

afterEach(() => {
  vi.restoreAllMocks();
});

const VALID_PAGE = {
  title: 'Services',
  subtitle: 'Sub',
  explanation: 'Explanation',
  businessAccelerator: 'Accelerator',
  results: 'Results',
  cardFooter: 'Footer',
};

const VALID_CARD = {
  cardIcon: '/icon.svg',
  title: 'Card Title',
  description: 'Card description',
  topics: ['Topic 1', 'Topic 2'],
};

// ─── getPage ──────────────────────────────────────────────────────────────────

describe('servicesService.getPage', () => {
  it('returns the services page when found', async () => {
    const page = { id: 'sp-1', ...VALID_PAGE };
    vi.spyOn(repo, 'findFirst').mockResolvedValue(page);

    const result = await servicesService.getPage();

    expect(result).toBe(page);
  });

  it('throws 404 when page does not exist', async () => {
    vi.spyOn(repo, 'findFirst').mockResolvedValue(null);

    await expect(servicesService.getPage()).rejects.toMatchObject({ status: 404 });
  });
});

// ─── upsertPage ───────────────────────────────────────────────────────────────

describe('servicesService.upsertPage', () => {
  it('creates page when none exists', async () => {
    vi.spyOn(repo, 'findFirst').mockResolvedValue(null);
    const createSpy = vi.spyOn(repo, 'createPage').mockResolvedValue({ id: 'sp-1' });

    await servicesService.upsertPage(VALID_PAGE);

    expect(createSpy).toHaveBeenCalledOnce();
  });

  it('updates page when one already exists', async () => {
    vi.spyOn(repo, 'findFirst').mockResolvedValue({ id: 'sp-1' });
    const updateSpy = vi.spyOn(repo, 'updatePage').mockResolvedValue({ id: 'sp-1' });

    await servicesService.upsertPage(VALID_PAGE);

    expect(updateSpy).toHaveBeenCalledWith('sp-1', expect.any(Object));
  });

  it('throws 400 when a required field is missing', async () => {
    vi.spyOn(repo, 'findFirst').mockResolvedValue(null);
    const { title, ...incomplete } = VALID_PAGE;

    await expect(servicesService.upsertPage(incomplete)).rejects.toMatchObject({ status: 400 });
  });

  it('sanitizes XSS in page payload', async () => {
    vi.spyOn(repo, 'findFirst').mockResolvedValue(null);
    const createSpy = vi.spyOn(repo, 'createPage').mockResolvedValue({ id: 'sp-1' });

    await servicesService.upsertPage({ ...VALID_PAGE, title: '<script>xss</script>' });

    const payload = createSpy.mock.calls[0][0];
    expect(payload.title).toBe('&lt;script&gt;xss&lt;/script&gt;');
  });
});

// ─── listCards ────────────────────────────────────────────────────────────────

describe('servicesService.listCards', () => {
  it('returns cards when page exists', async () => {
    const cards = [{ id: 'c-1', title: 'Card 1' }];
    vi.spyOn(repo, 'findFirst').mockResolvedValue({ id: 'sp-1' });
    vi.spyOn(repo, 'findAllCards').mockResolvedValue(cards);

    const result = await servicesService.listCards();

    expect(result).toBe(cards);
  });

  it('throws 404 when page does not exist', async () => {
    vi.spyOn(repo, 'findFirst').mockResolvedValue(null);

    await expect(servicesService.listCards()).rejects.toMatchObject({ status: 404 });
  });
});

// ─── getCard ──────────────────────────────────────────────────────────────────

describe('servicesService.getCard', () => {
  it('returns a card by id', async () => {
    const card = { id: 'c-1', ...VALID_CARD };
    vi.spyOn(repo, 'findCardById').mockResolvedValue(card);

    const result = await servicesService.getCard('c-1');

    expect(result).toBe(card);
  });

  it('throws 404 when card is not found', async () => {
    vi.spyOn(repo, 'findCardById').mockResolvedValue(null);

    await expect(servicesService.getCard('missing')).rejects.toMatchObject({ status: 404 });
  });
});

// ─── createCard ───────────────────────────────────────────────────────────────

describe('servicesService.createCard', () => {
  it('creates a card when page exists', async () => {
    vi.spyOn(repo, 'findFirst').mockResolvedValue({ id: 'sp-1' });
    const createSpy = vi.spyOn(repo, 'createCard').mockResolvedValue({ id: 'c-new' });

    await servicesService.createCard(VALID_CARD);

    expect(createSpy).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Card Title', servicesPageId: 'sp-1' }),
    );
  });

  it('throws 400 when a required card field is missing', async () => {
    const { cardIcon, ...incomplete } = VALID_CARD;

    await expect(servicesService.createCard(incomplete)).rejects.toMatchObject({ status: 400 });
  });

  it('throws when page does not exist', async () => {
    vi.spyOn(repo, 'findFirst').mockResolvedValue(null);

    await expect(servicesService.createCard(VALID_CARD)).rejects.toMatchObject({ status: 400 });
  });
});

// ─── updateCard ───────────────────────────────────────────────────────────────

describe('servicesService.updateCard', () => {
  it('updates a card', async () => {
    vi.spyOn(repo, 'findCardById').mockResolvedValue({ id: 'c-1' });
    const updateSpy = vi.spyOn(repo, 'updateCard').mockResolvedValue({ id: 'c-1' });

    await servicesService.updateCard('c-1', { title: 'New Title' });

    expect(updateSpy).toHaveBeenCalledWith('c-1', expect.objectContaining({ title: 'New Title' }));
  });

  it('throws 404 when card not found', async () => {
    vi.spyOn(repo, 'findCardById').mockResolvedValue(null);

    await expect(servicesService.updateCard('missing', { title: 'X' })).rejects.toMatchObject({ status: 404 });
  });
});

// ─── deleteCard ───────────────────────────────────────────────────────────────

describe('servicesService.deleteCard', () => {
  it('deletes a card that exists', async () => {
    vi.spyOn(repo, 'findCardById').mockResolvedValue({ id: 'c-1' });
    const deleteSpy = vi.spyOn(repo, 'deleteCard').mockResolvedValue(undefined);

    await servicesService.deleteCard('c-1');

    expect(deleteSpy).toHaveBeenCalledWith('c-1');
  });

  it('throws 404 when card to delete is not found', async () => {
    vi.spyOn(repo, 'findCardById').mockResolvedValue(null);

    await expect(servicesService.deleteCard('missing')).rejects.toMatchObject({ status: 404 });
  });
});
