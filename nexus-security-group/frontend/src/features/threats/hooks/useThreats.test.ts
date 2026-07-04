import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import * as threatsApi from '../api';
import type { Threat } from '../types';
import { useThreats } from './useThreats';

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
  },
  {
    id: '2',
    type: 'brand_impersonation',
    severity: 'critical',
    confidence: 0.91,
    riskScore: null,
    detectedAt: '2026-07-03T11:00:00Z',
    relatedMention: { id: 'mention-2', text: 'lookalike domain', platform: 'reddit' },
  },
];

describe('useThreats', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('loads threats and exposes success state', async () => {
    vi.spyOn(threatsApi, 'fetchThreats').mockResolvedValue(threats);

    const { result } = renderHook(() => useThreats('fake-jwt'));

    expect(result.current.status).toBe('loading');

    await waitFor(() => expect(result.current.status).toBe('success'));
    expect(result.current.threats).toEqual(threats);
    expect(result.current.filteredThreats).toEqual([threats[1], threats[0]]);
  });

  it('uses empty state when the response has no threats', async () => {
    vi.spyOn(threatsApi, 'fetchThreats').mockResolvedValue([]);

    const { result } = renderHook(() => useThreats('fake-jwt'));

    await waitFor(() => expect(result.current.status).toBe('empty'));
    expect(result.current.emptyReason).toBe('initial-empty');
  });

  it('uses error state and reloads on retry', async () => {
    const fetchSpy = vi
      .spyOn(threatsApi, 'fetchThreats')
      .mockRejectedValueOnce(new Error('network down'))
      .mockResolvedValueOnce(threats);

    const { result } = renderHook(() => useThreats('fake-jwt'));

    await waitFor(() => expect(result.current.status).toBe('error'));
    expect(result.current.error).toBe('Threats could not be loaded');

    act(() => result.current.reload());
    await waitFor(() => expect(result.current.status).toBe('success'));
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });

  it('filters by loaded text, severity, and classification fields', async () => {
    vi.spyOn(threatsApi, 'fetchThreats').mockResolvedValue(threats);

    const { result } = renderHook(() => useThreats('fake-jwt'));
    await waitFor(() => expect(result.current.status).toBe('success'));

    act(() => result.current.setFilters({ search: 'lookalike', severity: '', classification: '' }));
    expect(result.current.filteredThreats).toEqual([threats[1]]);

    act(() => result.current.setFilters({ search: '', severity: 'high', classification: '' }));
    expect(result.current.filteredThreats).toEqual([threats[0]]);

    act(() => result.current.setFilters({ search: '', severity: '', classification: 'brand_impersonation' }));
    expect(result.current.filteredThreats).toEqual([threats[1]]);

    act(() => result.current.setFilters({ search: 'missing', severity: '', classification: '' }));
    expect(result.current.status).toBe('empty');
    expect(result.current.emptyReason).toBe('no-results');
  });
});
