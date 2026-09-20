import { QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { LanguageProvider } from '../../../shared/contexts/LanguageContext';
import { createTestQueryClient } from '../../../shared/test/createTestQueryClient';
import { AuthProvider } from '../../auth';
import { AlertsPage } from './AlertsPage';

const encodePayload = (payload: unknown) =>
  btoa(JSON.stringify(payload)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');

const tokenWith = (permissions: string[]) => `header.${encodePayload({ permissions })}.signature`;

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

const renderAlertsPage = (permissions = ['alerts:read', 'alerts:write']) => {
  localStorage.setItem('nsg:auth:token', tokenWith(permissions));
  return render(
    <QueryClientProvider client={createTestQueryClient()}>
      <LanguageProvider>
        <AuthProvider>
          <AlertsPage />
        </AuthProvider>
      </LanguageProvider>
    </QueryClientProvider>,
  );
};

describe('AlertsPage', () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it('renders backend alerts with severity, channels, delivery, acknowledgement, and timestamps', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({ ok: true, json: async () => [alertResponse] } as Response);

    renderAlertsPage();

    expect(screen.getByRole('heading', { name: 'Alerts Center' })).toBeInTheDocument();
    expect(await screen.findByText('Critical mention')).toBeInTheDocument();
    expect(screen.getByText('Critical')).toBeInTheDocument();
    expect(screen.getByText('A critical threat mention was detected.')).toBeInTheDocument();
    expect(screen.getByText('slack, #secops')).toBeInTheDocument();
    expect(screen.getAllByText('Delivered').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Unacknowledged').length).toBeGreaterThan(0);
    expect(screen.getByText(/Created:/)).toBeInTheDocument();
  });

  it('sends only backend-supported filters and resets pagination', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue({ ok: true, json: async () => [] } as Response);
    const user = userEvent.setup();

    renderAlertsPage(['alerts:read']);

    await user.selectOptions(screen.getByLabelText('Delivery status'), 'failed');
    await user.selectOptions(screen.getByLabelText('Acknowledgement'), 'false');

    await waitFor(() => {
      expect(fetchMock).toHaveBeenLastCalledWith('/api/alerts?limit=25&offset=0&delivery_status=failed&acknowledged=false', expect.any(Object));
    });
  });

  it('shows acknowledge only with alerts:write and refreshes after success', async () => {
    const user = userEvent.setup();
    const fetchMock = vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce({ ok: true, json: async () => [alertResponse] } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ...alertResponse, acknowledged: true, acknowledged_by: 'alice', acknowledged_at: '2026-09-20T10:05:00Z' }),
      } as Response)
      .mockResolvedValueOnce({ ok: true, json: async () => [{ ...alertResponse, acknowledged: true }] } as Response);

    renderAlertsPage();

    await user.click(await screen.findByRole('button', { name: 'Acknowledge' }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith('/api/alerts/7/acknowledge', expect.objectContaining({ method: 'PATCH' })));
    expect(await screen.findByRole('status')).toHaveTextContent('Critical mention acknowledged successfully.');
  });

  it('keeps read-only users from seeing acknowledge actions', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({ ok: true, json: async () => [alertResponse] } as Response);

    renderAlertsPage(['alerts:read']);

    expect(await screen.findByText('Critical mention')).toBeInTheDocument();
    expect(screen.getByRole('note')).toHaveTextContent('alerts:write');
    expect(screen.queryByRole('button', { name: 'Acknowledge' })).not.toBeInTheDocument();
  });

  it('shows empty and error states', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({ ok: true, json: async () => [] } as Response);
    const { unmount } = renderAlertsPage();
    expect(await screen.findByText('No alerts returned')).toBeInTheDocument();
    unmount();

    vi.restoreAllMocks();
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({ ok: false, status: 403, json: async () => ({ detail: 'Forbidden' }) } as Response);
    renderAlertsPage();
    expect(await screen.findByRole('alert')).toHaveTextContent('Forbidden');
  });
});
