// NOTE: This module provides API functions for the metrics feature. The corresponding hook and UI components are planned for a future release.
import { createAuthHeaders } from '../../shared/api/authHeaders';
import { METRICS_SUMMARY_ENDPOINT } from './contract';

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
  const res = await fetch(METRICS_SUMMARY_ENDPOINT, {
    headers: createAuthHeaders(token),
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch metrics summary: ${res.status}`);
  }

  return res.json() as Promise<MetricsSummary>;
}
