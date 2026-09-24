import { afterEach, describe, expect, it, vi } from 'vitest';
import { acknowledgeAlert, AcknowledgeAlertError, listAlerts, ListAlertsError } from './api';
import { ALERTS_COPY, ALERTS_ENDPOINT } from './contract';

const alertResponse = {
  alert_id: 7,
  detection_id: 99,
  alert_uuid: 'c7e2fe34-2f46-49a4-9667-e86fb8a3c2fa',
  alert_title: 'Critical mention',
  alert_message: 'A critical threat mention was detected.',
  alert_severity: 'critical',
  channels_sent: ['slack'],
  slack_channel: '#secops',
  created_at: '2026-09-20T10:00:00Z',
  sent_at: '2026-09-20T10:01:00Z',
  delivery_status: 'delivered',
  acknowledged: false,
  acknowledged_by: null,
  acknowledged_at: null,
  last_updated: '2026-09-20T10:01:00Z',
};

describe('alerts api', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('lists alerts with backend-supported query params and auth headers', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => [alertResponse],
    } as Response);

    await expect(listAlerts('fake-jwt', { limit: 25, offset: 50, delivery_status: 'failed', acknowledged: false })).resolves.toEqual([alertResponse]);

    expect(fetchMock).toHaveBeenCalledWith(`${ALERTS_ENDPOINT}?limit=25&offset=50&delivery_status=failed&acknowledged=false`, {
      method: 'GET',
      headers: { Authorization: 'Bearer fake-jwt' },
    });
  });

  it('acknowledges an alert with PATCH and no request body', async () => {
    const acknowledged = { ...alertResponse, acknowledged: true, acknowledged_by: 'alice', acknowledged_at: '2026-09-20T10:05:00Z' };
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue({ ok: true, json: async () => acknowledged } as Response);

    await expect(acknowledgeAlert('fake-jwt', 7)).resolves.toEqual(acknowledged);

    expect(fetchMock).toHaveBeenCalledWith(`${ALERTS_ENDPOINT}/7/acknowledge`, {
      method: 'PATCH',
      headers: { Authorization: 'Bearer fake-jwt' },
    });
  });

  it('fails before calling fetch when token is missing', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch');

    await expect(listAlerts(null)).rejects.toThrow(ALERTS_COPY.errors.listWithoutToken);
    await expect(acknowledgeAlert(null, 7)).rejects.toThrow(ALERTS_COPY.errors.acknowledgeWithoutToken);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('maps backend details and network failures to alert errors', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({ ok: false, status: 403, json: async () => ({ detail: 'Forbidden' }) } as Response);
    await expect(listAlerts('fake-jwt')).rejects.toMatchObject(new ListAlertsError('Forbidden', 403));

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({ ok: false, status: 404, json: async () => ({}) } as Response);
    await expect(acknowledgeAlert('fake-jwt', 404)).rejects.toMatchObject(new AcknowledgeAlertError(ALERTS_COPY.errors.notFound, 404));

    vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(new Error('offline'));
    await expect(listAlerts('fake-jwt')).rejects.toMatchObject(new ListAlertsError(ALERTS_COPY.errors.serviceUnavailable));
  });
});
