import { authFetch } from '../../shared/api/apiClient';
import { KEYWORDS_COPY, KEYWORDS_ENDPOINT } from './contract';
import type { ApiErrorResponse, KeywordCreatePayload, KeywordResponse, KeywordUpdatePayload } from './types';

export { KEYWORDS_ENDPOINT } from './contract';

export class ListKeywordsError extends Error {
  constructor(message: string, public readonly status?: number) {
    super(message);
    this.name = 'ListKeywordsError';
  }
}

export class CreateKeywordError extends Error {
  constructor(message: string, public readonly status?: number) {
    super(message);
    this.name = 'CreateKeywordError';
  }
}

export class UpdateKeywordError extends Error {
  constructor(message: string, public readonly status?: number) {
    super(message);
    this.name = 'UpdateKeywordError';
  }
}

export class DeleteKeywordError extends Error {
  constructor(message: string, public readonly status?: number) {
    super(message);
    this.name = 'DeleteKeywordError';
  }
}

const readErrorDetail = async (response: Response): Promise<string | undefined> => {
  try {
    const data = (await response.json()) as ApiErrorResponse;
    return typeof data.detail === 'string' && data.detail.trim().length > 0 ? data.detail : undefined;
  } catch {
    return undefined;
  }
};

const fallbackMessageByStatus = (status: number, fallback: string): string => {
  if (status === 401) return KEYWORDS_COPY.errors.unauthenticated;
  if (status === 403) return KEYWORDS_COPY.errors.forbidden;
  if (status === 409) return KEYWORDS_COPY.errors.conflict;
  if (status === 422) return KEYWORDS_COPY.errors.validation;
  return fallback;
};

export async function listKeywords(token: string | null): Promise<KeywordResponse[]> {
  if (!token) throw new ListKeywordsError(KEYWORDS_COPY.errors.listWithoutToken);

  try {
    const response = await authFetch(token, KEYWORDS_ENDPOINT, { method: 'GET' });
    if (!response.ok) {
      const detail = await readErrorDetail(response);
      throw new ListKeywordsError(detail ?? fallbackMessageByStatus(response.status, KEYWORDS_COPY.errors.listFallback), response.status);
    }

    return (await response.json()) as KeywordResponse[];
  } catch (error) {
    if (error instanceof ListKeywordsError) throw error;
    throw new ListKeywordsError(KEYWORDS_COPY.errors.serviceUnavailable);
  }
}

export async function createKeyword(token: string | null, payload: KeywordCreatePayload): Promise<KeywordResponse> {
  if (!token) throw new CreateKeywordError(KEYWORDS_COPY.errors.createWithoutToken);

  try {
    const response = await authFetch(token, KEYWORDS_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      const detail = await readErrorDetail(response);
      throw new CreateKeywordError(detail ?? fallbackMessageByStatus(response.status, KEYWORDS_COPY.errors.createFallback), response.status);
    }

    return (await response.json()) as KeywordResponse;
  } catch (error) {
    if (error instanceof CreateKeywordError) throw error;
    throw new CreateKeywordError(KEYWORDS_COPY.errors.serviceUnavailable);
  }
}

export async function updateKeyword(token: string | null, keywordId: number, payload: KeywordUpdatePayload): Promise<KeywordResponse> {
  if (!token) throw new UpdateKeywordError(KEYWORDS_COPY.errors.updateWithoutToken);

  try {
    const response = await authFetch(token, `${KEYWORDS_ENDPOINT}/${keywordId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      const detail = await readErrorDetail(response);
      throw new UpdateKeywordError(detail ?? fallbackMessageByStatus(response.status, KEYWORDS_COPY.errors.updateFallback), response.status);
    }

    return (await response.json()) as KeywordResponse;
  } catch (error) {
    if (error instanceof UpdateKeywordError) throw error;
    throw new UpdateKeywordError(KEYWORDS_COPY.errors.serviceUnavailable);
  }
}

export async function deleteKeyword(token: string | null, keywordId: number): Promise<void> {
  if (!token) throw new DeleteKeywordError(KEYWORDS_COPY.errors.deleteWithoutToken);

  try {
    const response = await authFetch(token, `${KEYWORDS_ENDPOINT}/${keywordId}`, { method: 'DELETE' });
    if (!response.ok) {
      const detail = await readErrorDetail(response);
      throw new DeleteKeywordError(detail ?? fallbackMessageByStatus(response.status, KEYWORDS_COPY.errors.deleteFallback), response.status);
    }
  } catch (error) {
    if (error instanceof DeleteKeywordError) throw error;
    throw new DeleteKeywordError(KEYWORDS_COPY.errors.serviceUnavailable);
  }
}
