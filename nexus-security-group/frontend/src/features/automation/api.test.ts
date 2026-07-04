import { afterEach, describe, expect, it, vi } from 'vitest';
import { triggerScrapeWorkflow } from './api';

describe('triggerScrapeWorkflow', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('preserves the n8n endpoint, POST method, auth header, and success status behavior', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue({ ok: true } as Response);

    await expect(triggerScrapeWorkflow('fake-jwt')).resolves.toBe(true);

    expect(fetchMock).toHaveBeenCalledWith('/api/n8n/webhook/scrape', {
      method: 'POST',
      headers: { Authorization: 'Bearer fake-jwt' },
    });
  });

  it('preserves failure status behavior for non-ok responses', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({ ok: false } as Response);

    await expect(triggerScrapeWorkflow('fake-jwt')).resolves.toBe(false);
  });
});
