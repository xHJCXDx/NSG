import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchMentions } from './api';

describe('fetchMentions', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('calls the replaceable metrics mentions endpoint with limit and auth header', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ mentions: [] }),
    } as Response);

    await fetchMentions('fake-jwt', { limit: 25 });

    expect(fetchMock).toHaveBeenCalledWith('/api/metrics/mentions?limit=25', {
      headers: { Authorization: 'Bearer fake-jwt' },
    });
  });

  it('maps supported raw backend aliases without inferring sentiment or status', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({
        mentions: [
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
      }),
    } as Response);

    await expect(fetchMentions('fake-jwt')).resolves.toEqual([
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
  });

  it('returns an empty list for non-ok responses', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({ ok: false } as Response);

    await expect(fetchMentions('fake-jwt')).rejects.toThrow('Mentions could not be loaded');
  });
});
