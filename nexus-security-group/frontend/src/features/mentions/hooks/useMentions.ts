import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchMentions } from '../api';
import type { MentionFilters, MentionLoadStatus } from '../types';

const initialFilters: MentionFilters = { search: '', platform: '' };

export type MentionEmptyReason = 'initial-empty' | 'no-results';

export function useMentions(token: string | null) {
  const [filters, setFilters] = useState<MentionFilters>(initialFilters);

  const { data: mentions = [], isLoading, isError } = useQuery({
    queryKey: ['mentions'],
    queryFn: () => fetchMentions(token),
    enabled: !!token,
  });

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

  return {
    mentions,
    filteredMentions,
    status: derivedStatus,
    error: isError ? 'Failed to load mentions' : null,
    filters,
    setFilters,
    emptyReason,
  };
}
