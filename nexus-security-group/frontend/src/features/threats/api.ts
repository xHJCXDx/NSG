import { authFetch } from '../../shared/api/apiClient';
import { THREATS_COPY, THREATS_DEFAULT_PAGE_SIZE, THREATS_ENDPOINT } from './contract';
import type { RawRelatedMention, RawThreat, RelatedMention, Threat, ThreatsQuery } from './types';
import type { PaginatedResponse } from '../../shared/types';

export { THREATS_ENDPOINT } from './contract';


const toOptionalString = (value: string | number | null | undefined) =>
  value === null || value === undefined || value === '' ? undefined : String(value);

const toNumber = (value: number | string | null | undefined, fallback = 0) => {
  if (value === null || value === undefined || value === '') {
    return fallback;
  }

  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isNaN(parsed) ? fallback : parsed;
};

const toOptionalNumber = (value: number | string | null | undefined) => {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isNaN(parsed) ? null : parsed;
};

const toEvidence = (raw: RawThreat): string[] | undefined => {
  const values = [raw.evidence, raw.matched_keywords, raw.detection_rules_triggered]
    .flatMap((value) => (Array.isArray(value) ? value : value ? [value] : []))
    .map(String)
    .filter(Boolean);

  return values.length > 0 ? values : undefined;
};

const mapRelatedMention = (raw?: RawRelatedMention | null): RelatedMention | undefined => {
  if (!raw) {
    return undefined;
  }

  const id = toOptionalString(raw.id ?? raw.mention_id);
  if (!id) {
    return undefined;
  }

  const text = toOptionalString(raw.text ?? raw.text_content);
  const platform = toOptionalString(raw.platform ?? raw.source);

  return {
    id,
    ...(text ? { text } : {}),
    ...(platform ? { platform } : {}),
  };
};

export const mapRawThreat = (raw: RawThreat): Threat => {
  if (!toOptionalString(raw.detection_id ?? raw.id)) {
    if (import.meta.env.DEV) console.warn('Backend returned item without ID, using generated fallback');
  }
  const id = toOptionalString(raw.detection_id ?? raw.id) ?? crypto.randomUUID();
  const mentionId = toOptionalString(raw.mention_id);
  const type = toOptionalString(raw.threat_type ?? raw.type) ?? 'unknown';
  const category = toOptionalString(raw.threat_category ?? raw.category) ?? null;
  const severity = toOptionalString(raw.criticality_level ?? raw.severity) ?? 'unknown';
  const confidence = toNumber(raw.confidence_score ?? raw.confidence);
  const riskScore = toOptionalNumber(raw.risk_score ?? raw.riskScore);
  const detectedAt = toOptionalString(raw.detected_at ?? raw.created_at) ?? '';
  const source = toOptionalString(raw.source) ?? null;
  const summary = toOptionalString(raw.contextual_notes ?? raw.summary);
  const evidence = toEvidence(raw);
  const relatedMention = mapRelatedMention(raw.related_mention ?? raw.mention);

  return {
    id,
    ...(mentionId ? { mentionId } : {}),
    type,
    category,
    severity,
    confidence,
    riskScore,
    detectedAt,
    source,
    ...(summary ? { summary } : {}),
    ...(evidence ? { evidence } : {}),
    ...(relatedMention ? { relatedMention } : {}),
  };
};

export async function fetchThreats(token: string | null, query: ThreatsQuery = {}): Promise<PaginatedResponse<Threat>> {
  const params = new URLSearchParams({
    page: String(query.page ?? 1),
    page_size: String(query.pageSize ?? THREATS_DEFAULT_PAGE_SIZE),
  });
  const res = await authFetch(token, `${THREATS_ENDPOINT}?${params.toString()}`);

  if (!res.ok) {
    throw new Error(THREATS_COPY.error.title);
  }

  const envelope = (await res.json()) as PaginatedResponse<RawThreat>;
  return {
    data: envelope.data.map(mapRawThreat),
    total: envelope.total,
    page: envelope.page,
    page_size: envelope.page_size,
    total_pages: envelope.total_pages,
  };
}
