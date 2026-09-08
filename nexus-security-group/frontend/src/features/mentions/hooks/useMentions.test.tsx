import { QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createTestQueryClient } from '../../../shared/test/createTestQueryClient';
import * as mentionsApi from '../api';
import type { Mention } from '../types';
import { useMentions } from './useMentions';

function createWrapper() {
  const queryClient = createTestQueryClient();
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

const mentions: Mention[] = [
  {
    id: '1',
    platform: 'twitter',
    text: 'Brand mention about NSG',
    createdAt: '2026-07-03T10:00:00Z',
    author: 'alice',
  },
  {
    id: '2',
    platform: 'reddit',
    text: 'Community thread',
    createdAt: '2026-07-03T11:00:00Z',
    author: 'bob',
  },
];

describe('useMentions', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('loads mentions and exposes success state', async () => {
    vi.spyOn(mentionsApi, 'fetchMentions').mockResolvedValue(mentions);

    const { result } = renderHook(() => useMentions('fake-jwt'), { wrapper: createWrapper() });

    expect(result.current.status).toBe('loading');

    await waitFor(() => expect(result.current.status).toBe('success'));
    expect(result.current.mentions).toEqual(mentions);
    expect(result.current.filteredMentions).toEqual(mentions);
  });

  it('uses empty state when the response has no mentions', async () => {
    vi.spyOn(mentionsApi, 'fetchMentions').mockResolvedValue([]);

    const { result } = renderHook(() => useMentions('fake-jwt'), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.status).toBe('empty'));
    expect(result.current.filteredMentions).toEqual([]);
  });

  it('uses error state when loading fails', async () => {
    vi.spyOn(mentionsApi, 'fetchMentions').mockRejectedValue(new Error('network down'));

    const { result } = renderHook(() => useMentions('fake-jwt'), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.status).toBe('error'));
    expect(result.current.error).toBe('Failed to load mentions');
  });

  it('filters by text, platform, and author using only loaded fields', async () => {
    vi.spyOn(mentionsApi, 'fetchMentions').mockResolvedValue(mentions);

    const { result } = renderHook(() => useMentions('fake-jwt'), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.status).toBe('success'));

    act(() => result.current.setFilters({ search: 'bob', platform: '' }));
    expect(result.current.filteredMentions).toEqual([mentions[1]]);

    act(() => result.current.setFilters({ search: '', platform: 'twitter' }));
    expect(result.current.filteredMentions).toEqual([mentions[0]]);

    act(() => result.current.setFilters({ search: 'missing', platform: '' }));
    expect(result.current.status).toBe('empty');
    expect(result.current.emptyReason).toBe('no-results');
  });
});
