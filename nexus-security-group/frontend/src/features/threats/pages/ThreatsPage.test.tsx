import { QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createTestQueryClient } from '../../../shared/test/createTestQueryClient';
import { AuthProvider } from '../../auth';
import { ThreatsPage } from './ThreatsPage';

const renderThreatsPage = () => {
  localStorage.setItem('token', 'fake-jwt');
  return render(
    <QueryClientProvider client={createTestQueryClient()}>
      <AuthProvider>
        <ThreatsPage />
      </AuthProvider>
    </QueryClientProvider>,
  );
};

describe('ThreatsPage', () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it('shows loading and then renders detected threats without out-of-scope actions', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({
        threats: [
          {
            detection_id: 'threat-1',
            threat_type: 'credential_leak',
            threat_category: 'data exposure',
            criticality_level: 'high',
            confidence_score: 0.87,
            risk_score: 72,
            detected_at: '2026-07-03T10:00:00Z',
            contextual_notes: 'Potential leaked credential',
            matched_keywords: ['password'],
            related_mention: { id: 'mention-1', text: 'public post', platform: 'twitter' },
          },
        ],
      }),
    } as Response);

    renderThreatsPage();

    expect(screen.getByRole('status')).toHaveTextContent('Loading threats');
    expect(await screen.findByText('Potential leaked credential')).toBeInTheDocument();
    expect(screen.getByText('credential_leak')).toBeInTheDocument();
    expect(screen.getByText('data exposure')).toBeInTheDocument();
    expect(screen.getByText('high')).toBeInTheDocument();
    expect(screen.getByText('Confidence 87%')).toBeInTheDocument();
    expect(screen.getByText('Evidence')).toBeInTheDocument();
    expect(screen.getByText('password')).toBeInTheDocument();
    expect(screen.getByText(/Related mention: public post/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /resolve|keyword|n8n|workflow/i })).not.toBeInTheDocument();
  });

  it('shows initial empty and load error states distinctly with retry', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => ({ threats: [] }),
    } as Response);

    renderThreatsPage();

    expect(await screen.findByText('No threats detected yet')).toBeInTheDocument();
    cleanup();

    fetchMock.mockResolvedValueOnce({ ok: false } as Response).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ threats: [] }),
    } as Response);

    renderThreatsPage();
    expect(await screen.findByText('Threats could not be loaded')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(await screen.findByText('No threats detected yet')).toBeInTheDocument();
  });

  it('filters threats by supported fields and shows no-results copy', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({
        threats: [
          {
            id: '1',
            threat_type: 'credential_leak',
            criticality_level: 'high',
            confidence_score: 0.87,
            detected_at: '2026-07-03T10:00:00Z',
            contextual_notes: 'Potential leaked credential',
          },
          {
            id: '2',
            threat_type: 'brand_impersonation',
            criticality_level: 'critical',
            confidence_score: 0.91,
            detected_at: '2026-07-03T11:00:00Z',
            contextual_notes: 'Lookalike domain found',
          },
        ],
      }),
    } as Response);

    renderThreatsPage();
    expect(await screen.findByText('Potential leaked credential')).toBeInTheDocument();

    await userEvent.type(screen.getByPlaceholderText('Search by evidence, summary, source, or mention'), 'lookalike');
    expect(screen.queryByText('Potential leaked credential')).not.toBeInTheDocument();
    expect(screen.getByText('Lookalike domain found')).toBeInTheDocument();

    await userEvent.clear(screen.getByPlaceholderText('Search by evidence, summary, source, or mention'));
    await userEvent.type(screen.getByPlaceholderText('Severity'), 'low');

    await waitFor(() => expect(screen.getByText('No matching threats')).toBeInTheDocument());
  });

  it('hides filter criteria controls when severity and classification are unavailable', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({
        threats: [
          {
            id: 'threat-without-filter-fields',
            confidence_score: 0.64,
            detected_at: '2026-07-03T12:00:00Z',
            contextual_notes: 'Unclassified signal with no filter criteria in contract',
          },
        ],
      }),
    } as Response);

    renderThreatsPage();

    expect(await screen.findByText('Unclassified signal with no filter criteria in contract')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Search by evidence, summary, source, or mention')).toBeInTheDocument();
    expect(screen.queryByPlaceholderText('Severity')).not.toBeInTheDocument();
    expect(screen.queryByPlaceholderText('Classification')).not.toBeInTheDocument();
  });
});
