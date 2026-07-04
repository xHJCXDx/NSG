import { createAuthHeaders } from '../../shared/api/authHeaders';

export interface MetricsSummary {
  total_mentions: number;
  sentiment_distribution: {
    positive?: number;
    neutral?: number;
    negative?: number;
  };
  alerts_count: number;
}

export async function fetchMetricsSummary(token: string | null) {
  const res = await fetch('/api/metrics/summary', {
    headers: createAuthHeaders(token),
  });

  if (!res.ok) {
    return null;
  }

  return res.json() as Promise<MetricsSummary>;
}
