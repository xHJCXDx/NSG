import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  fetchMentionsOverTime,
  fetchMetricsSummary,
  fetchPlatformDistribution,
  fetchSentimentOverTime,
  fetchThreatCategories,
  fetchThreatsBySeverity,
} from './api';
import {
  MENTIONS_OVER_TIME_ENDPOINT,
  METRICS_SUMMARY_ENDPOINT,
  PLATFORM_DISTRIBUTION_ENDPOINT,
  SENTIMENT_OVER_TIME_ENDPOINT,
  THREAT_CATEGORIES_ENDPOINT,
  THREATS_BY_SEVERITY_ENDPOINT,
} from './contract';

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

    await expect(fetchMetricsSummary('fake-jwt')).rejects.toThrow();
  });
});

describe('fetchMentionsOverTime', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('preserves the mentions-over-time endpoint, auth header, days param, and response data contract', async () => {
    const data = [
      { date: '2024-01-01', count: 5 },
      { date: '2024-01-02', count: 8 },
    ];
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => data,
    } as Response);

    await expect(fetchMentionsOverTime('fake-jwt', 7)).resolves.toEqual(data);

    expect(fetchMock).toHaveBeenCalledWith(`${MENTIONS_OVER_TIME_ENDPOINT}?days=7`, {
      headers: { Authorization: 'Bearer fake-jwt' },
    });
  });

  it('uses 30 as the default value for days', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => [],
    } as Response);

    await fetchMentionsOverTime('fake-jwt');

    expect(fetchMock).toHaveBeenCalledWith(`${MENTIONS_OVER_TIME_ENDPOINT}?days=30`, {
      headers: { Authorization: 'Bearer fake-jwt' },
    });
  });

  it('preserves null data behavior for non-ok responses', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({ ok: false } as Response);

    await expect(fetchMentionsOverTime('fake-jwt')).rejects.toThrow();
  });
});

describe('fetchSentimentOverTime', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('preserves the sentiment-over-time endpoint, auth header, days param, and response data contract', async () => {
    const data = [
      { date: '2024-01-01', positive: 3, neutral: 2, negative: 1 },
      { date: '2024-01-02', positive: 4, neutral: 1, negative: 2 },
    ];
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => data,
    } as Response);

    await expect(fetchSentimentOverTime('fake-jwt', 14)).resolves.toEqual(data);

    expect(fetchMock).toHaveBeenCalledWith(`${SENTIMENT_OVER_TIME_ENDPOINT}?days=14`, {
      headers: { Authorization: 'Bearer fake-jwt' },
    });
  });

  it('uses 30 as the default value for days', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => [],
    } as Response);

    await fetchSentimentOverTime('fake-jwt');

    expect(fetchMock).toHaveBeenCalledWith(`${SENTIMENT_OVER_TIME_ENDPOINT}?days=30`, {
      headers: { Authorization: 'Bearer fake-jwt' },
    });
  });

  it('preserves null data behavior for non-ok responses', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({ ok: false } as Response);

    await expect(fetchSentimentOverTime('fake-jwt')).rejects.toThrow();
  });
});

describe('fetchThreatsBySeverity', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('preserves the threats-by-severity endpoint, auth header, and response data contract', async () => {
    const data = [
      { label: 'high', count: 4 },
      { label: 'low', count: 12 },
    ];
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => data,
    } as Response);

    await expect(fetchThreatsBySeverity('fake-jwt')).resolves.toEqual(data);

    expect(fetchMock).toHaveBeenCalledWith(THREATS_BY_SEVERITY_ENDPOINT, {
      headers: { Authorization: 'Bearer fake-jwt' },
    });
  });

  it('preserves null data behavior for non-ok responses', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({ ok: false } as Response);

    await expect(fetchThreatsBySeverity('fake-jwt')).rejects.toThrow();
  });
});

describe('fetchPlatformDistribution', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('preserves the platform-distribution endpoint, auth header, and response data contract', async () => {
    const data = [
      { label: 'twitter', count: 20 },
      { label: 'reddit', count: 9 },
    ];
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => data,
    } as Response);

    await expect(fetchPlatformDistribution('fake-jwt')).resolves.toEqual(data);

    expect(fetchMock).toHaveBeenCalledWith(PLATFORM_DISTRIBUTION_ENDPOINT, {
      headers: { Authorization: 'Bearer fake-jwt' },
    });
  });

  it('preserves null data behavior for non-ok responses', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({ ok: false } as Response);

    await expect(fetchPlatformDistribution('fake-jwt')).rejects.toThrow();
  });
});

describe('fetchThreatCategories', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('preserves the threat-categories endpoint, auth header, and response data contract', async () => {
    const data = [
      { label: 'phishing', count: 6 },
      { label: 'malware', count: 3 },
    ];
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => data,
    } as Response);

    await expect(fetchThreatCategories('fake-jwt')).resolves.toEqual(data);

    expect(fetchMock).toHaveBeenCalledWith(THREAT_CATEGORIES_ENDPOINT, {
      headers: { Authorization: 'Bearer fake-jwt' },
    });
  });

  it('preserves null data behavior for non-ok responses', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({ ok: false } as Response);

    await expect(fetchThreatCategories('fake-jwt')).rejects.toThrow();
  });
});
