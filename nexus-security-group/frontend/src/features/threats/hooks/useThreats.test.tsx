import { QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createTestQueryClient } from '../../../shared/test/createTestQueryClient';
import { AuthProvider } from '../../auth';
import * as threatsApi from '../api';
import type { ThreatsPaginatedResponse } from '../api';
import type { Threat } from '../types';
import { useThreats } from './useThreats';

function createWrapper() {
  const queryClient = createTestQueryClient();
  localStorage.setItem('nsg:auth:token', 'fake-jwt');
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>{children}</AuthProvider>
    </QueryClientProvider>
  );
}

const threats: Threat[] = [
  {
    id: '1',
    type: 'credential_leak',
    category: 'data exposure',
    severity: 'high',
    confidence: 0.87,
    riskScore: 72,
    detectedAt: '2026-07-03T10:00:00Z',
    summary: 'Potential leaked credential',
    evidence: ['password'],
    reviewStatus: 'pending',
    reviewedBy: null,
    reviewedAt: null,
    reviewNotes: null,
    remediationStatus: null,
  },
  {
    id: '2',
    type: 'brand_impersonation',
    severity: 'critical',
    confidence: 0.91,
    riskScore: null,
    detectedAt: '2026-07-03T11:00:00Z',
    relatedMention: { id: 'mention-2', text: 'lookalike domain', platform: 'reddit' },
    reviewStatus: 'reviewing',
    reviewedBy: 'analyst1',
    reviewedAt: '2026-07-03T11:30:00Z',
    reviewNotes: null,
    remediationStatus: 'in_progress',
  },
];

const paginatedResponse: ThreatsPaginatedResponse = {
  data: threats,
  total: 2,
  page: 1,
  page_size: 25,
  total_pages: 1,
  available_severities: ['critical', 'high'],
  available_classifications: ['brand_impersonation', 'credential_leak', 'data exposure'],
};

const emptyResponse: ThreatsPaginatedResponse = {
  data: [],
  total: 0,
  page: 1,
  page_size: 25,
  total_pages: 0,
  available_severities: ['critical', 'high'],
  available_classifications: ['brand_impersonation', 'credential_leak', 'data exposure'],
};

describe('useThreats', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('loads threats and exposes success state', async () => {
    vi.spyOn(threatsApi, 'fetchThreats').mockResolvedValue(paginatedResponse);

    const { result } = renderHook(() => useThreats(), { wrapper: createWrapper() });

    expect(result.current.status).toBe('loading');

    await waitFor(() => expect(result.current.status).toBe('success'));
    expect(result.current.threats).toEqual(threats);
    expect(result.current.filteredThreats).toEqual([threats[1], threats[0]]);
  });

  it('uses empty state when the response has no threats', async () => {
    vi.spyOn(threatsApi, 'fetchThreats').mockResolvedValue(emptyResponse);

    const { result } = renderHook(() => useThreats(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.status).toBe('empty'));
    expect(result.current.emptyReason).toBe('initial-empty');
  });

  it('uses error state and reloads on retry', async () => {
    const fetchSpy = vi
      .spyOn(threatsApi, 'fetchThreats')
      .mockRejectedValueOnce(new Error('network down'))
      .mockResolvedValueOnce(paginatedResponse);

    const { result } = renderHook(() => useThreats(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.status).toBe('error'));
    expect(result.current.error).toBe('Failed to load threats');

    act(() => result.current.reload());
    await waitFor(() => expect(result.current.status).toBe('success'));
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });

  it('filters by text and classification client-side, exposes backend filter options', async () => {
    vi.spyOn(threatsApi, 'fetchThreats').mockResolvedValue(paginatedResponse);

    const { result } = renderHook(() => useThreats(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.status).toBe('success'));

    expect(result.current.availableFilters.severityOptions).toEqual(['critical', 'high']);
    expect(result.current.availableFilters.classificationOptions).toEqual(['brand_impersonation', 'credential_leak', 'data exposure']);

    act(() => result.current.setFilters({ search: 'lookalike', severity: '', classification: '', reviewStatus: '' }));
    expect(result.current.filteredThreats).toEqual([threats[1]]);

    act(() => result.current.setFilters({ search: '', severity: '', classification: 'brand_impersonation', reviewStatus: '' }));
    expect(result.current.filteredThreats).toEqual([threats[1]]);

    act(() => result.current.setFilters({ search: 'missing', severity: '', classification: '', reviewStatus: '' }));
    expect(result.current.status).toBe('empty');
    expect(result.current.emptyReason).toBe('no-results');
  });

  it('passes severity filter to the API for server-side filtering', async () => {
    const fetchSpy = vi.spyOn(threatsApi, 'fetchThreats').mockResolvedValue(paginatedResponse);

    const { result } = renderHook(() => useThreats(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.status).toBe('success'));

    act(() => result.current.setFilters({ search: '', severity: 'high', classification: '', reviewStatus: '' }));
    await waitFor(() => expect(fetchSpy).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ criticality_level: 'high' })));
  });
});
