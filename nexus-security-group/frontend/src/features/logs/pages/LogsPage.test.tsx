import { QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { LanguageProvider } from '../../../shared/contexts/LanguageContext';
import { DateFormatProvider } from '../../../shared/contexts/DateFormatContext';
import { createTestQueryClient } from '../../../shared/test/createTestQueryClient';
import { AuthProvider } from '../../auth';
import { LogsPage } from './LogsPage';

const encodePayload = (payload: unknown) =>
  btoa(JSON.stringify(payload)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');

const tokenWith = (permissions: string[]) => `header.${encodePayload({ permissions })}.signature`;

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

const renderLogsPage = () => {
  localStorage.setItem('nsg:auth:token', tokenWith(['logs:read']));
  return render(
    <QueryClientProvider client={createTestQueryClient()}>
      <LanguageProvider>
        <DateFormatProvider>
          <AuthProvider>
            <LogsPage />
          </AuthProvider>
        </DateFormatProvider>
      </LanguageProvider>
    </QueryClientProvider>,
  );
};

describe('LogsPage', () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it('renders execution logs with filters and simple next/previous pagination', async () => {
    const firstPage = Array.from({ length: 25 }, (_, index) => ({ ...executionLog, log_id: index + 1, execution_uuid: `exec-${index + 1}` }));
    const fetchMock = vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce({ ok: true, json: async () => firstPage } as Response)
      .mockResolvedValueOnce({ ok: true, json: async () => [] } as Response)
      .mockResolvedValueOnce({ ok: true, json: async () => [{ ...executionLog, log_id: 99, workflow_name: 'Filtered Workflow', status: 'error' }] } as Response);
    const user = userEvent.setup();

    renderLogsPage();

    expect(screen.getByRole('heading', { name: 'Logs & Activity' })).toBeInTheDocument();
    expect((await screen.findAllByText('OSINT Pipeline')).length).toBeGreaterThan(0);
    expect(screen.getAllByText('Mentions collected: 10').length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: 'Next' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Previous' })).toBeDisabled();

    await user.selectOptions(screen.getByLabelText('Status'), 'error');
    await user.type(screen.getByLabelText('Workflow name'), 'Filtered Workflow');

    await waitFor(() => {
      expect(fetchMock).toHaveBeenLastCalledWith('/api/logs?limit=25&offset=0&status=error&workflow_name=Filtered+Workflow', expect.any(Object));
    });
  });

  it('renders user activity without previous/next and hides sensitive fields by default', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce({ ok: true, json: async () => [] } as Response)
      .mockResolvedValue({ ok: true, json: async () => [userActivity] } as Response);
    const user = userEvent.setup();

    renderLogsPage();
    await user.click(screen.getByRole('tab', { name: 'User Activity' }));

    expect(await screen.findByText('alice')).toBeInTheDocument();
    expect(screen.getByText('User logged in')).toBeInTheDocument();
    expect(screen.getByText('Detection #4 · Alert #5')).toBeInTheDocument();
    expect(screen.queryByText('127.0.0.1')).not.toBeInTheDocument();
    expect(screen.queryByText('Mozilla')).not.toBeInTheDocument();
    expect(screen.queryByText('secret-session')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Next' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Previous' })).not.toBeInTheDocument();

    await user.type(screen.getByLabelText('Username'), 'alice');
    await user.type(screen.getByLabelText('Activity type'), 'login');
    await user.selectOptions(screen.getByLabelText('Limit'), '10');

    await waitFor(() => {
      expect(fetchMock).toHaveBeenLastCalledWith('/api/activity?limit=10&username=alice&activity_type=login', expect.any(Object));
    });
  });

  it('shows empty and error states for both tabs', async () => {
    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce({ ok: true, json: async () => [] } as Response)
      .mockResolvedValueOnce({ ok: true, json: async () => [] } as Response);
    const user = userEvent.setup();

    const { unmount } = renderLogsPage();
    expect(await screen.findByText('No execution logs returned')).toBeInTheDocument();
    await user.click(screen.getByRole('tab', { name: 'User Activity' }));
    expect(await screen.findByText('No user activity returned')).toBeInTheDocument();
    unmount();

    vi.restoreAllMocks();
    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce({ ok: false, status: 403, json: async () => ({ detail: 'Forbidden logs' }) } as Response)
      .mockResolvedValueOnce({ ok: false, status: 403, json: async () => ({ detail: 'Forbidden activity' }) } as Response);
    renderLogsPage();
    expect(await screen.findByRole('alert')).toHaveTextContent('Forbidden logs');
    await user.click(screen.getByRole('tab', { name: 'User Activity' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Forbidden activity');
  });
});
