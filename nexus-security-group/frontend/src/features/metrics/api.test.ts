import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchMetricsSummary } from './api';

describe('fetchMetricsSummary', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('preserves the metrics endpoint, auth header, and response data contract', async () => {
    const summary = {
      total_mentions: 7,
      sentiment_distribution: { positive: 3, neutral: 2, negative: 2 },
      alerts_count: 1,
    };
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => summary,
    } as Response);

    await expect(fetchMetricsSummary('fake-jwt')).resolves.toEqual(summary);

    expect(fetchMock).toHaveBeenCalledWith('/api/metrics/summary', {
      headers: { Authorization: 'Bearer fake-jwt' },
    });
  });

  it('preserves null data behavior for non-ok responses', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({ ok: false } as Response);

    await expect(fetchMetricsSummary('fake-jwt')).resolves.toBeNull();
  });
});
