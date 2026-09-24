import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchHealth } from './api';
import { HEALTH_ENDPOINT } from './contract';

describe('fetchHealth', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('calls the health endpoint and returns the status', async () => {
    const healthResponse = { status: 'healthy', db: 'connected' };
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => healthResponse,
    } as Response);

    await expect(fetchHealth()).resolves.toEqual(healthResponse);

    expect(fetchMock).toHaveBeenCalledWith(HEALTH_ENDPOINT);
  });

  it('returns unavailable fallback on network error instead of throwing', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('offline'));

    await expect(fetchHealth()).resolves.toEqual({ status: 'unavailable', db: 'unavailable' });
  });
});
