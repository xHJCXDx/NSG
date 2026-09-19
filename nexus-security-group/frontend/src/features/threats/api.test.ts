import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchThreats, mapRawThreat, THREATS_ENDPOINT } from './api';

describe('fetchThreats', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('calls the threats endpoint with page and page_size params', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ data: [], total: 0, page: 1, page_size: 25, total_pages: 0, available_severities: [], available_classifications: [] }),
    } as Response);

    await fetchThreats('fake-jwt', { page: 2, pageSize: 10 });

    expect(THREATS_ENDPOINT).toBe('/api/threats');
    expect(fetchMock).toHaveBeenCalledWith('/api/threats?page=2&page_size=10', {
      headers: { Authorization: 'Bearer fake-jwt' },
    });
  });

  it('maps supported raw backend aliases and optional related mentions', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({
        data: [
          {
            detection_id: 42,
            mention_id: 'mention-1',
            threat_type: 'credential_leak',
            threat_category: 'data exposure',
            criticality_level: 'high',
            confidence_score: '0.87',
            risk_score: 72,
            detected_at: '2026-07-03T10:00:00Z',
            contextual_notes: 'Potential leaked credential in public post',
            matched_keywords: ['password'],
            related_mention: { id: 'mention-1', text: 'leaked password', platform: 'twitter' },
          },
          {
            id: 'direct-id',
            type: 'brand_impersonation',
            severity: 'critical',
            confidence: 0.91,
            created_at: '2026-07-03T11:00:00Z',
            evidence: 'lookalike domain',
          },
        ],
        total: 2,
        page: 1,
        page_size: 25,
        total_pages: 1,
      }),
    } as Response);

    const result = await fetchThreats('fake-jwt');
    expect(result.data).toEqual([
      {
        id: '42',
        mentionId: 'mention-1',
        type: 'credential_leak',
        category: 'data exposure',
        severity: 'high',
        confidence: 0.87,
        riskScore: 72,
        detectedAt: '2026-07-03T10:00:00Z',
        source: null,
        summary: 'Potential leaked credential in public post',
        evidence: ['password'],
        relatedMention: { id: 'mention-1', text: 'leaked password', platform: 'twitter' },
      },
      {
        id: 'direct-id',
        type: 'brand_impersonation',
        category: null,
        severity: 'critical',
        confidence: 0.91,
        riskScore: null,
        detectedAt: '2026-07-03T11:00:00Z',
        source: null,
        evidence: ['lookalike domain'],
      },
    ]);
    expect(result.total).toBe(2);
    expect(result.total_pages).toBe(1);
    expect(result.available_severities).toEqual([]);
    expect(result.available_classifications).toEqual([]);
  });

  it('passes criticality_level filter as query param', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ data: [], total: 0, page: 1, page_size: 25, total_pages: 0, available_severities: ['high'], available_classifications: [] }),
    } as Response);

    await fetchThreats('fake-jwt', { page: 1, criticality_level: 'high' });

    expect(fetchMock).toHaveBeenCalledWith('/api/threats?page=1&page_size=25&criticality_level=high', {
      headers: { Authorization: 'Bearer fake-jwt' },
    });
  });

  it('does not invent mention relations when none are provided', () => {
    expect(mapRawThreat({ id: '1', threat_type: 'malware', criticality_level: 'medium' }).relatedMention).toBeUndefined();
  });

  it('throws for non-ok responses', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({ ok: false } as Response);

    await expect(fetchThreats('fake-jwt')).rejects.toThrow('Threats could not be loaded');
  });
});
