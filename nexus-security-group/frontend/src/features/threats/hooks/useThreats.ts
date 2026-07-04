import { useCallback, useEffect, useMemo, useState } from 'react';
import { fetchThreats } from '../api';
import type { Threat, ThreatFilters, ThreatLoadStatus } from '../types';

const initialFilters: ThreatFilters = { search: '', severity: '', classification: '' };

export type ThreatEmptyReason = 'initial-empty' | 'no-results';

export function useThreats(token: string | null) {
  const [threats, setThreats] = useState<Threat[]>([]);
  const [status, setStatus] = useState<ThreatLoadStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<ThreatFilters>(initialFilters);
  const [reloadKey, setReloadKey] = useState(0);

  const reload = useCallback(() => setReloadKey((current) => current + 1), []);

  useEffect(() => {
    let active = true;

    setStatus('loading');
    setError(null);

    fetchThreats(token)
      .then((loadedThreats) => {
        if (!active) {
          return;
        }

        setThreats(loadedThreats);
        setStatus(loadedThreats.length > 0 ? 'success' : 'empty');
      })
      .catch(() => {
        if (!active) {
          return;
        }

        setThreats([]);
        setError('Threats could not be loaded');
        setStatus('error');
      });

    return () => {
      active = false;
    };
  }, [reloadKey, token]);

  const availableFilters = useMemo(
    () => ({
      severity: threats.some((threat) => threat.severity && threat.severity !== 'unknown'),
      classification: threats.some((threat) => threat.type && threat.type !== 'unknown'),
    }),
    [threats],
  );

  const filteredThreats = useMemo(() => {
    const search = filters.search.trim().toLowerCase();
    const severity = filters.severity.trim().toLowerCase();
    const classification = filters.classification.trim().toLowerCase();

    return threats
      .filter((threat) => {
        const searchableText = [
          threat.type,
          threat.category,
          threat.severity,
          threat.summary,
          threat.source,
          threat.relatedMention?.text,
          threat.relatedMention?.platform,
          ...(threat.evidence ?? []),
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();

        const matchesSearch = search.length === 0 || searchableText.includes(search);
        const matchesSeverity = severity.length === 0 || threat.severity.toLowerCase() === severity;
        const matchesClassification =
          classification.length === 0 ||
          threat.type.toLowerCase() === classification ||
          (threat.category?.toLowerCase() === classification ?? false);

        return matchesSearch && matchesSeverity && matchesClassification;
      })
      .sort((left, right) => {
        const rightDate = new Date(right.detectedAt).getTime();
        const leftDate = new Date(left.detectedAt).getTime();

        if (Number.isNaN(rightDate) || Number.isNaN(leftDate)) {
          return right.confidence - left.confidence;
        }

        return rightDate - leftDate;
      });
  }, [filters, threats]);

  const hasActiveFilters =
    filters.search.trim().length > 0 || filters.severity.trim().length > 0 || filters.classification.trim().length > 0;
  const emptyReason: ThreatEmptyReason = threats.length === 0 ? 'initial-empty' : 'no-results';
  const derivedStatus: ThreatLoadStatus =
    status === 'success' && hasActiveFilters && filteredThreats.length === 0 ? 'empty' : status;

  return {
    threats,
    filteredThreats,
    status: derivedStatus,
    error,
    filters,
    setFilters,
    availableFilters,
    emptyReason,
    reload,
  };
}
