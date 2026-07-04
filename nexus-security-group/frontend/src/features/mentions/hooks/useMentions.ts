import { useEffect, useMemo, useState } from 'react';
import { fetchMentions } from '../api';
import type { Mention, MentionFilters, MentionLoadStatus } from '../types';

const initialFilters: MentionFilters = { search: '', platform: '' };

export type MentionEmptyReason = 'initial-empty' | 'no-results';

export function useMentions(token: string | null) {
  const [mentions, setMentions] = useState<Mention[]>([]);
  const [status, setStatus] = useState<MentionLoadStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<MentionFilters>(initialFilters);

  useEffect(() => {
    let active = true;

    setStatus('loading');
    setError(null);

    fetchMentions(token)
      .then((loadedMentions) => {
        if (!active) {
          return;
        }

        setMentions(loadedMentions);
        setStatus(loadedMentions.length > 0 ? 'success' : 'empty');
      })
      .catch(() => {
        if (!active) {
          return;
        }

        setMentions([]);
        setError('Mentions could not be loaded');
        setStatus('error');
      });

    return () => {
      active = false;
    };
  }, [token]);

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
    status === 'success' && hasActiveFilters && filteredMentions.length === 0 ? 'empty' : status;

  return {
    mentions,
    filteredMentions,
    status: derivedStatus,
    error,
    filters,
    setFilters,
    emptyReason,
  };
}
