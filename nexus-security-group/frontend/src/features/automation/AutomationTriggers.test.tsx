import { QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createTestQueryClient } from '../../shared/test/createTestQueryClient';
import { AuthProvider } from '../auth';
import { AUTOMATION_COPY } from './contract';
import { getAutomationStatus } from './api';
import { AutomationTriggers } from './AutomationTriggers';

const encodePayload = (payload: unknown) =>
  btoa(JSON.stringify(payload)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');

const makeToken = (permissions: string[]) => `header.${encodePayload({ permissions })}.signature`;

const renderWithAuth = (token = makeToken(['workflows:execute'])) => {
  localStorage.setItem('token', token);
  return render(
    <QueryClientProvider client={createTestQueryClient()}>
      <AuthProvider>
        <AutomationTriggers />
      </AuthProvider>
    </QueryClientProvider>,
  );
};

describe('AutomationTriggers', () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it('renders the automation state from the feature status contract', () => {
    const status = getAutomationStatus();

    renderWithAuth();

    expect(screen.getByRole('heading', { name: status.title })).toBeInTheDocument();
    expect(screen.getByText(status.description)).toBeInTheDocument();
    expect(screen.getByText(status.scheduleLabel)).toBeInTheDocument();
  });

  it('enables the manual trigger button when webhook is configured', () => {
    renderWithAuth();

    const button = screen.getByRole('button', { name: /Run OSINT scan/i });
    expect(button).toBeEnabled();
  });

  it('disables the manual trigger button when workflows:execute is missing', () => {
    renderWithAuth(makeToken(['workflows:read']));

    expect(screen.getByRole('button', { name: /Run OSINT scan/i })).toBeDisabled();
    expect(screen.getByRole('note')).toHaveTextContent('workflows:execute');
  });

  it('shows loading state while scan is running', async () => {
    const user = userEvent.setup();
    vi.spyOn(globalThis, 'fetch').mockReturnValueOnce(
      new Promise(() => {}),
    );

    renderWithAuth();

    await user.click(screen.getByRole('button', { name: /Run OSINT scan/i }));

    expect(screen.getByRole('button', { name: /Running scan/i })).toBeDisabled();
  });

  it('shows success message after a successful trigger', async () => {
    const user = userEvent.setup();
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => ({ status: 'ok' }),
    } as Response);

    renderWithAuth();

    await user.click(screen.getByRole('button', { name: /Run OSINT scan/i }));

    const successBanner = await screen.findByRole('status');
    expect(successBanner).toHaveTextContent(AUTOMATION_COPY.success);
    expect(screen.getByRole('button', { name: /Run OSINT scan/i })).toBeEnabled();
  });

  it('shows error message when the workflow is unreachable', async () => {
    const user = userEvent.setup();
    vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(new Error('Network error'));

    renderWithAuth();

    await user.click(screen.getByRole('button', { name: /Run OSINT scan/i }));

    const errorBanner = await screen.findByRole('alert');
    expect(errorBanner).toHaveTextContent(AUTOMATION_COPY.error.fallback);
  });

  it('shows backend error detail when proxy returns an error response', async () => {
    const user = userEvent.setup();
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: false,
      status: 502,
      json: async () => ({ detail: 'n8n service unavailable' }),
    } as Response);

    renderWithAuth();

    await user.click(screen.getByRole('button', { name: /Run OSINT scan/i }));

    const errorBanner = await screen.findByRole('alert');
    expect(errorBanner).toHaveTextContent('n8n service unavailable');
  });

  it('sends the request to the correct proxy endpoint with auth header', async () => {
    const user = userEvent.setup();
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => ({ status: 'ok' }),
    } as Response);

    const token = makeToken(['workflows:execute']);
    renderWithAuth(token);

    await user.click(screen.getByRole('button', { name: /Run OSINT scan/i }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(
      '/api/n8n/webhook/osint-trigger',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: `Bearer ${token}`,
        }),
      }),
    ));
  });
});
