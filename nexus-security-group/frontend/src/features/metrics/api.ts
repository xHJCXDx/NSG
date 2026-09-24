import { authFetch } from '../../shared/api/apiClient';
import {
  ALERT_HEALTH_ENDPOINT,
  MENTIONS_OVER_TIME_ENDPOINT,
  METRICS_SUMMARY_ENDPOINT,
  PLATFORM_DISTRIBUTION_ENDPOINT,
  PLATFORM_SENTIMENT_ENDPOINT,
  RISK_SCORE_DISTRIBUTION_ENDPOINT,
  SENTIMENT_OVER_TIME_ENDPOINT,
  THREAT_CATEGORIES_ENDPOINT,
  THREAT_REVIEW_STATUS_ENDPOINT,
  THREATS_BY_SEVERITY_ENDPOINT,
  TOP_KEYWORDS_ENDPOINT,
  WORKFLOW_HEALTH_ENDPOINT,
} from './contract';
import type { AlertHealthSummary, CategoryCount, MetricsSummary, PlatformSentimentEntry, RiskScoreBucket, SentimentTimeSeriesPoint, TimeSeriesPoint, TopKeywordEntry, WorkflowHealthEntry } from './types';

export async function fetchAlertHealth(token: string | null, days = 30): Promise<AlertHealthSummary> {
  const res = await authFetch(token, `${ALERT_HEALTH_ENDPOINT}?days=${days}`);
  if (!res.ok) throw new Error(`Failed to fetch alert health: ${res.status}`);
  return res.json() as Promise<AlertHealthSummary>;
}

export async function fetchMetricsSummary(token: string | null): Promise<MetricsSummary> {
  const res = await authFetch(token, METRICS_SUMMARY_ENDPOINT);
  if (!res.ok) throw new Error(`Failed to fetch metrics summary: ${res.status}`);
  return res.json() as Promise<MetricsSummary>;
}

export async function fetchMentionsOverTime(token: string | null, days = 30): Promise<TimeSeriesPoint[]> {
  const res = await authFetch(token, `${MENTIONS_OVER_TIME_ENDPOINT}?days=${days}`);
  if (!res.ok) throw new Error(`Failed to fetch mentions over time: ${res.status}`);
  return res.json() as Promise<TimeSeriesPoint[]>;
}

export async function fetchSentimentOverTime(token: string | null, days = 30): Promise<SentimentTimeSeriesPoint[]> {
  const res = await authFetch(token, `${SENTIMENT_OVER_TIME_ENDPOINT}?days=${days}`);
  if (!res.ok) throw new Error(`Failed to fetch sentiment trends: ${res.status}`);
  return res.json() as Promise<SentimentTimeSeriesPoint[]>;
}

export async function fetchThreatsBySeverity(token: string | null, days = 30): Promise<CategoryCount[]> {
  const res = await authFetch(token, `${THREATS_BY_SEVERITY_ENDPOINT}?days=${days}`);
  if (!res.ok) throw new Error(`Failed to fetch threats by severity: ${res.status}`);
  return res.json() as Promise<CategoryCount[]>;
}

export async function fetchPlatformSentiment(token: string | null, days = 30): Promise<PlatformSentimentEntry[]> {
  const res = await authFetch(token, `${PLATFORM_SENTIMENT_ENDPOINT}?days=${days}`);
  if (!res.ok) throw new Error(`Failed to fetch platform sentiment: ${res.status}`);
  return res.json() as Promise<PlatformSentimentEntry[]>;
}

export async function fetchPlatformDistribution(token: string | null, days = 30): Promise<CategoryCount[]> {
  const res = await authFetch(token, `${PLATFORM_DISTRIBUTION_ENDPOINT}?days=${days}`);
  if (!res.ok) throw new Error(`Failed to fetch platform distribution: ${res.status}`);
  return res.json() as Promise<CategoryCount[]>;
}

export async function fetchThreatCategories(token: string | null, days = 30): Promise<CategoryCount[]> {
  const res = await authFetch(token, `${THREAT_CATEGORIES_ENDPOINT}?days=${days}`);
  if (!res.ok) throw new Error(`Failed to fetch threat categories: ${res.status}`);
  return res.json() as Promise<CategoryCount[]>;
}

export async function fetchThreatReviewStatus(token: string | null, days = 30): Promise<CategoryCount[]> {
  const res = await authFetch(token, `${THREAT_REVIEW_STATUS_ENDPOINT}?days=${days}`);
  if (!res.ok) throw new Error(`Failed to fetch threat review status: ${res.status}`);
  return res.json() as Promise<CategoryCount[]>;
}

export async function fetchRiskScoreDistribution(token: string | null, days = 30): Promise<RiskScoreBucket[]> {
  const res = await authFetch(token, `${RISK_SCORE_DISTRIBUTION_ENDPOINT}?days=${days}`);
  if (!res.ok) throw new Error(`Failed to fetch risk score distribution: ${res.status}`);
  return res.json() as Promise<RiskScoreBucket[]>;
}

export async function fetchTopKeywords(token: string | null, limit = 15): Promise<TopKeywordEntry[]> {
  const res = await authFetch(token, `${TOP_KEYWORDS_ENDPOINT}?limit=${limit}`);
  if (!res.ok) throw new Error(`Failed to fetch top keywords: ${res.status}`);
  return res.json() as Promise<TopKeywordEntry[]>;
}

export async function fetchWorkflowHealth(token: string | null, days = 30): Promise<WorkflowHealthEntry[]> {
  const res = await authFetch(token, `${WORKFLOW_HEALTH_ENDPOINT}?days=${days}`);
  if (!res.ok) throw new Error(`Failed to fetch workflow health: ${res.status}`);
  return res.json() as Promise<WorkflowHealthEntry[]>;
}
