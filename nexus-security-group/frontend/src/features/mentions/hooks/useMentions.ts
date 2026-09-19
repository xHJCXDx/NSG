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

  const { data: response, isLoading, isError } = useQuery({
    queryKey: ['mentions', claims.sub, page],
    queryFn: () => fetchMentions(token, { page }),
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
    const platform = filters.platform.trim().toLowerCase();

    return mentions.filter((mention) => {
      const matchesSearch =
        search.length === 0 ||
        mention.text.toLowerCase().includes(search) ||
        mention.platform.toLowerCase().includes(search) ||
        (mention.author?.toLowerCase().includes(search) ?? false);
      const matchesPlatform = platform.length === 0 || mention.platform.toLowerCase() === platform;

      return matchesSearch && matchesPlatform;
    });
  }, [filters, mentions]);

  const hasActiveFilters = filters.search.trim().length > 0 || filters.platform.trim().length > 0;
  const emptyReason: MentionEmptyReason = mentions.length === 0 ? 'initial-empty' : 'no-results';
  const derivedStatus: MentionLoadStatus =
    baseStatus === 'success' && hasActiveFilters && filteredMentions.length === 0 ? 'empty' : baseStatus;

  const availableFilters = useMemo(() => {
    const platformOptions = [...new Set(mentions.map((m) => m.platform).filter(Boolean))].sort();
    return { platformOptions };
  }, [mentions]);

  return {
    mentions,
    filteredMentions,
    status: derivedStatus,
    error: isError ? 'Failed to load mentions' : null,
    filters,
    setFilters,
    emptyReason,
    availableFilters,
    page,
    setPage,
    totalPages,
    total,
  };
}
