import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchDashboardSummary } from './api';

describe('fetchDashboardSummary', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('uses the dashboard summary endpoint, auth header, and exact response contract', async () => {
    const summary = {
      total_threats: 7,
      pending_threats: 2,
      total_alerts: 4,
      unacknowledged_alerts: 1,
      active_keywords: 9,
      execution_logs_count: 12,
      activity_count: 15,
    };
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => summary,
    } as Response);

    await expect(fetchDashboardSummary('fake-jwt')).resolves.toEqual(summary);

    expect(fetchMock).toHaveBeenCalledWith('/api/dashboard/summary', {
      headers: { Authorization: 'Bearer fake-jwt' },
    });
  });

  it('preserves null data behavior for non-ok responses', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({ ok: false } as Response);

    await expect(fetchDashboardSummary('fake-jwt')).resolves.toBeNull();
  });
});
