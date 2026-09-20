import { afterEach, describe, expect, it, vi } from 'vitest';
import { createKeyword, CreateKeywordError, deleteKeyword, DeleteKeywordError, listKeywords, ListKeywordsError, updateKeyword, UpdateKeywordError } from './api';
import { KEYWORDS_COPY, KEYWORDS_ENDPOINT } from './contract';
import type { KeywordCreatePayload, KeywordUpdatePayload } from './types';

const keywordResponse = {
  keyword_id: 10,
  keyword_text: 'acme',
  keyword_type: 'keyword',
  keyword_category: 'brand',
  keyword_weight: 20,
  is_active: true,
  is_regex: false,
  case_sensitive: false,
  added_by: 'alice',
  added_at: '2026-09-20T10:00:00Z',
  last_match_at: null,
  match_count: 0,
  false_positive_count: 0,
  true_positive_count: 0,
  trigger_immediate_alert: false,
  min_matches_for_alert: 1,
  description: null,
};

describe('keywords api', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('lists monitored keywords with auth headers', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => [keywordResponse],
    } as Response);

    await expect(listKeywords('fake-jwt')).resolves.toEqual([keywordResponse]);

    expect(fetchMock).toHaveBeenCalledWith(KEYWORDS_ENDPOINT, {
      method: 'GET',
      headers: { Authorization: 'Bearer fake-jwt' },
    });
  });

  it('creates a keyword with the backend KeywordCreate payload', async () => {
    const payload: KeywordCreatePayload = {
      keyword_text: 'acme',
      keyword_type: 'keyword',
      keyword_category: 'brand',
      keyword_weight: 20,
      is_active: true,
    };
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => keywordResponse,
    } as Response);

    await expect(createKeyword('fake-jwt', payload)).resolves.toEqual(keywordResponse);

    expect(fetchMock).toHaveBeenCalledWith(KEYWORDS_ENDPOINT, {
      method: 'POST',
      headers: { Authorization: 'Bearer fake-jwt', 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  });

  it('patches a keyword with partial backend KeywordUpdate payload', async () => {
    const payload: KeywordUpdatePayload = { keyword_text: 'acme corp', keyword_weight: 30, is_active: false };
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ ...keywordResponse, ...payload }),
    } as Response);

    await expect(updateKeyword('fake-jwt', 10, payload)).resolves.toEqual({ ...keywordResponse, ...payload });

    expect(fetchMock).toHaveBeenCalledWith(`${KEYWORDS_ENDPOINT}/10`, {
      method: 'PATCH',
      headers: { Authorization: 'Bearer fake-jwt', 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  });

  it('deletes a keyword through the protected endpoint', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue({ ok: true } as Response);

    await expect(deleteKeyword('fake-jwt', 10)).resolves.toBeUndefined();

    expect(fetchMock).toHaveBeenCalledWith(`${KEYWORDS_ENDPOINT}/10`, {
      method: 'DELETE',
      headers: { Authorization: 'Bearer fake-jwt' },
    });
  });

  it('fails before calling fetch when token is missing', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch');

    await expect(listKeywords(null)).rejects.toThrow(KEYWORDS_COPY.errors.listWithoutToken);
    await expect(createKeyword(null, { keyword_text: 'x' })).rejects.toThrow(KEYWORDS_COPY.errors.createWithoutToken);
    await expect(updateKeyword(null, 10, { keyword_text: 'x' })).rejects.toThrow(KEYWORDS_COPY.errors.updateWithoutToken);
    await expect(deleteKeyword(null, 10)).rejects.toThrow(KEYWORDS_COPY.errors.deleteWithoutToken);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('maps backend details and network failures to keyword errors', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({ ok: false, status: 403, json: async () => ({ detail: 'Forbidden' }) } as Response);
    await expect(listKeywords('fake-jwt')).rejects.toMatchObject(new ListKeywordsError('Forbidden', 403));

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({ ok: false, status: 409, json: async () => ({}) } as Response);
    await expect(createKeyword('fake-jwt', { keyword_text: 'acme' })).rejects.toMatchObject(new CreateKeywordError(KEYWORDS_COPY.errors.conflict, 409));

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({ ok: false, status: 422, json: async () => ({}) } as Response);
    await expect(updateKeyword('fake-jwt', 10, { keyword_weight: 200 })).rejects.toMatchObject(new UpdateKeywordError(KEYWORDS_COPY.errors.validation, 422));

    vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(new Error('offline'));
    await expect(deleteKeyword('fake-jwt', 10)).rejects.toMatchObject(new DeleteKeywordError(KEYWORDS_COPY.errors.serviceUnavailable));
  });
});
