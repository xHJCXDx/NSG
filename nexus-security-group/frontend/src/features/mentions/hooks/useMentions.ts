import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../auth';
import { fetchMentions } from '../api';
import type { MentionFilters, MentionLoadStatus } from '../types';

const initialFilters: MentionFilters = { search: '', platform: '' };

export type MentionEmptyReason = 'initial-empty' | 'no-results';

export function useMentions() {
  const { token, claims } = useAuth();
  const [filters, setFilters] = useState<MentionFilters>(initialFilters);
  const [page, setPage] = useState(1);

  const platformFilter = filters.platform.trim() || undefined;

  const { data: response, isLoading, isError } = useQuery({
    queryKey: ['mentions', claims.sub, page, platformFilter],
    queryFn: () => fetchMentions(token, { page, platform: platformFilter }),
    enabled: !!token,
  });

  const mentions = response?.data ?? [];
  const total = response?.total ?? 0;
  const totalPages = response?.total_pages ?? 1;

  const baseStatus: MentionLoadStatus = isLoading
    ? 'loading'
    : isError
      ? 'error'
      : mentions.length > 0
        ? 'success'
        : 'empty';

  const filteredMentions = useMemo(() => {
    const search = filters.search.trim().toLowerCase();

    if (search.length === 0) return mentions;

    return mentions.filter((mention) =>
      mention.text.toLowerCase().includes(search) ||
      mention.platform.toLowerCase().includes(search) ||
      (mention.author?.toLowerCase().includes(search) ?? false),
    );
  }, [filters.search, mentions]);

  const hasActiveFilters = filters.search.trim().length > 0 || filters.platform.trim().length > 0;
  const emptyReason: MentionEmptyReason = mentions.length === 0 ? 'initial-empty' : 'no-results';
  const derivedStatus: MentionLoadStatus =
    baseStatus === 'success' && hasActiveFilters && filteredMentions.length === 0 ? 'empty' : baseStatus;

  const availableFilters = useMemo(() => ({
    platformOptions: response?.available_platforms ?? [],
  }), [response?.available_platforms]);

  const setFiltersAndResetPage = (newFilters: MentionFilters) => {
    setFilters(newFilters);
    if (newFilters.platform !== filters.platform) {
      setPage(1);
    }
  };

  return {
    mentions,
    filteredMentions,
    status: derivedStatus,
    error: isError ? 'Failed to load mentions' : null,
    filters,
    setFilters: setFiltersAndResetPage,
    emptyReason,
    availableFilters,
    page,
    setPage,
    totalPages,
    total,
  };
}
