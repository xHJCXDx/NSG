import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchMetricsSummary } from './api';
import { METRICS_SUMMARY_ENDPOINT } from './contract';

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

    expect(fetchMock).toHaveBeenCalledWith(METRICS_SUMMARY_ENDPOINT, {
      headers: { Authorization: 'Bearer fake-jwt' },
    });
  });

  it('preserves null data behavior for non-ok responses', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({ ok: false } as Response);

    await expect(fetchMetricsSummary('fake-jwt')).resolves.toBeNull();
  });
});
