import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchMentions } from './api';

describe('fetchMentions', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('calls the mentions endpoint with page and page_size params', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ data: [], total: 0, page: 1, page_size: 25, total_pages: 0 }),
    } as Response);

    await fetchMentions('fake-jwt', { page: 2, pageSize: 10 });

    expect(fetchMock).toHaveBeenCalledWith('/api/metrics/mentions?page=2&page_size=10', {
      headers: { Authorization: 'Bearer fake-jwt' },
    });
  });

  it('maps supported raw backend aliases without inferring sentiment or status', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({
        data: [
          {
            id: 'direct-id',
            platform: 'twitter',
            text: 'First mention',
            created_at: '2026-07-03T10:00:00Z',
            author: 'alice',
          },
          {
            mention_id: 42,
            source: 'reddit',
            text_content: 'Second mention',
            created_at: '2026-07-03T11:00:00Z',
            author_username: 'bob',
            sentiment: 'neutral',
            status: 'processed',
          },
        ],
        total: 2,
        page: 1,
        page_size: 25,
        total_pages: 1,
      }),
    } as Response);

    const result = await fetchMentions('fake-jwt');
    expect(result.data).toEqual([
      {
        id: 'direct-id',
        platform: 'twitter',
        text: 'First mention',
        createdAt: '2026-07-03T10:00:00Z',
        author: 'alice',
      },
      {
        id: '42',
        platform: 'reddit',
        text: 'Second mention',
        createdAt: '2026-07-03T11:00:00Z',
        author: 'bob',
        status: 'processed',
        sentiment: 'neutral',
      },
    ]);
    expect(result.total).toBe(2);
    expect(result.total_pages).toBe(1);
  });

  it('returns an empty list for non-ok responses', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({ ok: false } as Response);

    await expect(fetchMentions('fake-jwt')).rejects.toThrow('Mentions could not be loaded');
  });
});
