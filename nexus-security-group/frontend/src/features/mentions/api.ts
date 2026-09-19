import { authFetch } from '../../shared/api/apiClient';
import { MENTIONS_COPY, MENTIONS_DEFAULT_PAGE_SIZE, MENTIONS_ENDPOINT } from './contract';
import type { Mention, MentionsQuery, RawMention } from './types';
import type { PaginatedResponse } from '../../shared/types';

export { MENTIONS_ENDPOINT } from './contract';


const toOptionalString = (value: string | number | null | undefined) =>
  value === null || value === undefined || value === '' ? undefined : String(value);

export const mapRawMention = (raw: RawMention): Mention => {
  if (!toOptionalString(raw.id ?? raw.mention_id)) {
    if (import.meta.env.DEV) console.warn('Backend returned item without ID, using generated fallback');
  }
  const id = toOptionalString(raw.id ?? raw.mention_id) ?? crypto.randomUUID();
  const text = toOptionalString(raw.text ?? raw.text_content ?? raw.content ?? raw.summary) ?? '';
  const platform = toOptionalString(raw.platform ?? raw.source) ?? 'other';
  const createdAt = toOptionalString(raw.created_at ?? raw.collected_at) ?? '';
  const author = toOptionalString(raw.author ?? raw.author_username) ?? null;
  const sourceUrl = toOptionalString(raw.source_url ?? raw.url);
  const collectedAt = toOptionalString(raw.collected_at);
  const status = toOptionalString(raw.status);
  const sentiment = toOptionalString(raw.sentiment);

  return {
    id,
    platform,
    text,
    createdAt,
    ...(collectedAt ? { collectedAt } : {}),
    ...(author ? { author } : {}),
    ...(status ? { status } : {}),
    ...(sentiment ? { sentiment } : {}),
    ...(sourceUrl ? { sourceUrl } : {}),
  };
};

export async function fetchMentions(token: string | null, query: MentionsQuery = {}): Promise<PaginatedResponse<Mention>> {
  const params = new URLSearchParams({
    page: String(query.page ?? 1),
    page_size: String(query.pageSize ?? MENTIONS_DEFAULT_PAGE_SIZE),
  });
  const res = await authFetch(token, `${MENTIONS_ENDPOINT}?${params.toString()}`);

  if (!res.ok) {
    throw new Error(MENTIONS_COPY.error.title);
  }

  const envelope = (await res.json()) as PaginatedResponse<RawMention>;
  return {
    data: envelope.data.map(mapRawMention),
    total: envelope.total,
    page: envelope.page,
    page_size: envelope.page_size,
    total_pages: envelope.total_pages,
  };
}
