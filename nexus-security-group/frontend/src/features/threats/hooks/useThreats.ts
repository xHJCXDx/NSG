import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../auth';
import { fetchThreats } from '../api';
import type { ThreatFilters, ThreatLoadStatus } from '../types';

const initialFilters: ThreatFilters = { search: '', severity: '', classification: '', reviewStatus: '' };

export type ThreatEmptyReason = 'initial-empty' | 'no-results';

export function useThreats() {
  const { token, claims } = useAuth();
  const [filters, setFilters] = useState<ThreatFilters>(initialFilters);
  const [page, setPage] = useState(1);

  const severityFilter = filters.severity.trim() || undefined;
  const reviewStatusFilter = filters.reviewStatus.trim() || undefined;

  const setFiltersAndResetPage = (newFilters: ThreatFilters) => {
    setFilters(newFilters);
    if (newFilters.severity !== filters.severity || newFilters.reviewStatus !== filters.reviewStatus) {
      setPage(1);
    }
  };

  const { data: response, isLoading, isError, refetch } = useQuery({
    queryKey: ['threats', claims.sub, page, severityFilter, reviewStatusFilter],
    queryFn: () => fetchThreats(token, { page, criticality_level: severityFilter, review_status: reviewStatusFilter }),
    enabled: !!token,
  });

  const threats = response?.data ?? [];
  const total = response?.total ?? 0;
  const totalPages = response?.total_pages ?? 1;

  const reload = () => { refetch(); };

  const baseStatus: ThreatLoadStatus = isLoading
    ? 'loading'
    : isError
      ? 'error'
      : threats.length > 0
        ? 'success'
        : 'empty';

  const availableFilters = useMemo(() => {
    const severityOptions = response?.available_severities ?? [];
    const classificationOptions = response?.available_classifications ?? [];
    return {
      severity: severityOptions.length > 0,
      classification: classificationOptions.length > 0,
      severityOptions,
      classificationOptions,
    };
  }, [response?.available_severities, response?.available_classifications]);

  const filteredThreats = useMemo(() => {
    const search = filters.search.trim().toLowerCase();
    const severity = filters.severity.trim().toLowerCase();
    const classification = filters.classification.trim().toLowerCase();
    const reviewStatusLocal = filters.reviewStatus.trim().toLowerCase();

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
          threat.category?.toLowerCase() === classification;
        const matchesReviewStatus =
          reviewStatusLocal.length === 0 || threat.reviewStatus.toLowerCase() === reviewStatusLocal;

        return matchesSearch && matchesSeverity && matchesClassification && matchesReviewStatus;
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
    filters.search.trim().length > 0 || filters.severity.trim().length > 0 || filters.classification.trim().length > 0 || filters.reviewStatus.trim().length > 0;
  const emptyReason: ThreatEmptyReason = threats.length === 0 ? 'initial-empty' : 'no-results';
  const derivedStatus: ThreatLoadStatus =
    baseStatus === 'success' && hasActiveFilters && filteredThreats.length === 0 ? 'empty' : baseStatus;

  return {
    threats,
    filteredThreats,
    status: derivedStatus,
    error: isError ? 'Failed to load threats' : null,
    filters,
    setFilters: setFiltersAndResetPage,
    availableFilters,
    emptyReason,
    reload,
    page,
    setPage,
    totalPages,
    total,
  };
}
