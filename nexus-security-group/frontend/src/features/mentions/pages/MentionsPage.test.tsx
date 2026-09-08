import { QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createTestQueryClient } from '../../../shared/test/createTestQueryClient';
import { AuthProvider } from '../../auth';
import { MentionsPage } from './MentionsPage';

const renderMentionsPage = () => {
  localStorage.setItem('token', 'fake-jwt');
  return render(
    <QueryClientProvider client={createTestQueryClient()}>
      <AuthProvider>
        <MentionsPage />
      </AuthProvider>
    </QueryClientProvider>,
  );
};

describe('MentionsPage', () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it('shows loading and then renders collected mentions without out-of-scope actions', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({
        mentions: [
          {
            id: '1',
            platform: 'twitter',
            text: 'Brand mention from social stream',
            created_at: '2026-07-03T10:00:00Z',
            author: 'alice',
            sentiment: 'neutral',
          },
        ],
      }),
    } as Response);

    renderMentionsPage();

    expect(screen.getByRole('status')).toHaveTextContent('Loading mentions');
    expect(await screen.findByText('Brand mention from social stream')).toBeInTheDocument();
    expect(screen.getByText('Author: alice')).toBeInTheDocument();
    expect(screen.queryByText(/threat|alert|keyword|workflow/i)).not.toBeInTheDocument();
  });

  it('shows initial empty, load error, and no-results states distinctly', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => ({ mentions: [] }),
    } as Response);

    const { rerender } = renderMentionsPage();

    expect(await screen.findByText('No mentions collected yet')).toBeInTheDocument();

    fetchMock.mockResolvedValueOnce({ ok: false } as Response);
    rerender(
      <QueryClientProvider client={createTestQueryClient()}>
        <AuthProvider>
          <MentionsPage />
        </AuthProvider>
      </QueryClientProvider>,
    );

    cleanup();

    fetchMock.mockResolvedValueOnce({ ok: false } as Response);
    renderMentionsPage();
    expect(await screen.findByText('Mentions could not be loaded')).toBeInTheDocument();
  });

  it('filters mentions by supported loaded fields and shows no-results copy', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({
        mentions: [
          { id: '1', platform: 'twitter', text: 'Brand mention', created_at: '2026-07-03T10:00:00Z', author: 'alice' },
          { id: '2', platform: 'reddit', text: 'Community thread', created_at: '2026-07-03T11:00:00Z', author: 'bob' },
        ],
      }),
    } as Response);

    renderMentionsPage();
    expect(await screen.findByText('Brand mention')).toBeInTheDocument();

    await userEvent.type(screen.getByPlaceholderText('Search by text, platform, or author'), 'bob');
    expect(screen.queryByText('Brand mention')).not.toBeInTheDocument();
    expect(screen.getByText('Community thread')).toBeInTheDocument();

    await userEvent.clear(screen.getByPlaceholderText('Search by text, platform, or author'));
    await userEvent.type(screen.getByPlaceholderText('Platform'), 'telegram');

    await waitFor(() => expect(screen.getByText('No matching mentions')).toBeInTheDocument());
  });
});
