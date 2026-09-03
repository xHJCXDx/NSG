import { createAuthHeaders } from '../../shared/api/authHeaders';
import { MENTIONS_COPY, MENTIONS_DEFAULT_LIMIT, MENTIONS_ENDPOINT } from './contract';
import type { Mention, MentionsQuery, RawMention, RawMentionsResponse } from './types';

export { MENTIONS_ENDPOINT } from './contract';

const pickMentionsArray = (payload: RawMention[] | RawMentionsResponse): RawMention[] => {
  if (Array.isArray(payload)) {
    return payload;
  }

  return payload.mentions ?? payload.results ?? payload.data ?? [];
};

const toOptionalString = (value: string | number | null | undefined) =>
  value === null || value === undefined || value === '' ? undefined : String(value);

export const mapRawMention = (raw: RawMention): Mention => {
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

export async function fetchMentions(token: string | null, query: MentionsQuery = {}): Promise<Mention[]> {
  const params = new URLSearchParams({ limit: String(query.limit ?? MENTIONS_DEFAULT_LIMIT) });
  const res = await fetch(`${MENTIONS_ENDPOINT}?${params.toString()}`, {
    headers: createAuthHeaders(token),
  });

  if (!res.ok) {
    throw new Error(MENTIONS_COPY.error.title);
  }

  const payload = (await res.json()) as RawMention[] | RawMentionsResponse;
  return pickMentionsArray(payload).map(mapRawMention);
}
