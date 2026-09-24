import { afterEach, describe, expect, it, vi } from 'vitest';
import { EXECUTION_LOGS_ENDPOINT, LOGS_COPY, USER_ACTIVITY_ENDPOINT } from './contract';
import { ListExecutionLogsError, ListUserActivityError, listExecutionLogs, listUserActivity } from './api';

const executionLog = {
  log_id: 1,
  execution_uuid: 'exec-uuid',
  workflow_name: 'OSINT Pipeline',
  execution_id: 'n8n-1',
  status: 'success',
  mentions_collected: 10,
  mentions_processed: 9,
  detections_generated: 2,
  alerts_generated: 1,
  started_at: '2026-09-20T10:00:00Z',
  completed_at: '2026-09-20T10:01:00Z',
  duration_seconds: 60,
  last_updated: '2026-09-20T10:01:00Z',
};

const userActivity = {
  activity_id: 3,
  username: 'alice',
  user_role: 'analyst',
  activity_type: 'login',
  activity_description: 'User logged in',
  related_mention_id: null,
  related_detection_id: 4,
  related_alert_id: 5,
  ip_address: '127.0.0.1',
  user_agent: 'Mozilla',
  session_id: 'secret-session',
  activity_timestamp: '2026-09-20T10:02:00Z',
  activity_data: { secret: true },
};

describe('logs api', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('lists execution logs with supported query params and auth headers', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue({ ok: true, json: async () => [executionLog] } as Response);

    await expect(listExecutionLogs('fake-jwt', { limit: 25, offset: 50, status: 'error', workflow_name: ' OSINT Pipeline ' })).resolves.toEqual([executionLog]);

    expect(fetchMock).toHaveBeenCalledWith(`${EXECUTION_LOGS_ENDPOINT}?limit=25&offset=50&status=error&workflow_name=OSINT+Pipeline`, {
      method: 'GET',
      headers: { Authorization: 'Bearer fake-jwt' },
    });
  });

  it('lists user activity without offset and with supported filters only', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue({ ok: true, json: async () => [userActivity] } as Response);

    await expect(listUserActivity('fake-jwt', { limit: 10, username: ' alice ', activity_type: 'login' })).resolves.toEqual([userActivity]);

    expect(fetchMock).toHaveBeenCalledWith(`${USER_ACTIVITY_ENDPOINT}?limit=10&username=alice&activity_type=login`, {
      method: 'GET',
      headers: { Authorization: 'Bearer fake-jwt' },
    });
  });

  it('fails before calling fetch when token is missing', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch');

    await expect(listExecutionLogs(null)).rejects.toThrow(LOGS_COPY.errors.executionWithoutToken);
    await expect(listUserActivity(null)).rejects.toThrow(LOGS_COPY.errors.activityWithoutToken);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('maps backend details and network failures to log errors', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({ ok: false, status: 403, json: async () => ({ detail: 'Forbidden' }) } as Response);
    await expect(listExecutionLogs('fake-jwt')).rejects.toMatchObject(new ListExecutionLogsError('Forbidden', 403));

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({ ok: false, status: 422, json: async () => ({}) } as Response);
    await expect(listUserActivity('fake-jwt')).rejects.toMatchObject(new ListUserActivityError(LOGS_COPY.errors.validation, 422));

    vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(new Error('offline'));
    await expect(listExecutionLogs('fake-jwt')).rejects.toMatchObject(new ListExecutionLogsError(LOGS_COPY.errors.serviceUnavailable));
  });
});
