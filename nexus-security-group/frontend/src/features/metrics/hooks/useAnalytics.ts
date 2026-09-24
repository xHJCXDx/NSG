import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../auth';
import {
  fetchAlertHealth,
  fetchMentionsOverTime,
  fetchMetricsSummary,
  fetchPlatformDistribution,
  fetchPlatformSentiment,
  fetchRiskScoreDistribution,
  fetchSentimentOverTime,
  fetchThreatReviewStatus,
  fetchThreatCategories,
  fetchThreatsBySeverity,
  fetchTopKeywords,
  fetchWorkflowHealth,
} from '../api';

export function useAnalytics(days = 30) {
  const { token, claims } = useAuth();
  const sub = claims?.sub;

  const summary = useQuery({
    queryKey: ['analytics', 'summary', sub],
    queryFn: () => fetchMetricsSummary(token),
    enabled: !!token,
  });

  const mentionsOverTime = useQuery({
    queryKey: ['analytics', 'mentions-over-time', days, sub],
    queryFn: () => fetchMentionsOverTime(token, days),
    enabled: !!token,
  });

  const sentimentOverTime = useQuery({
    queryKey: ['analytics', 'sentiment-over-time', days, sub],
    queryFn: () => fetchSentimentOverTime(token, days),
    enabled: !!token,
  });

  const threatsBySeverity = useQuery({
    queryKey: ['analytics', 'threats-by-severity', days, sub],
    queryFn: () => fetchThreatsBySeverity(token, days),
    enabled: !!token,
  });

  const platformDistribution = useQuery({
    queryKey: ['analytics', 'platform-distribution', days, sub],
    queryFn: () => fetchPlatformDistribution(token, days),
    enabled: !!token,
  });

  const threatCategories = useQuery({
    queryKey: ['analytics', 'threat-categories', days, sub],
    queryFn: () => fetchThreatCategories(token, days),
    enabled: !!token,
  });

  const platformSentiment = useQuery({
    queryKey: ['analytics', 'platform-sentiment', days, sub],
    queryFn: () => fetchPlatformSentiment(token, days),
    enabled: !!token,
  });

  const alertHealth = useQuery({
    queryKey: ['analytics', 'alert-health', days, sub],
    queryFn: () => fetchAlertHealth(token, days),
    enabled: !!token,
  });

  const threatReviewStatus = useQuery({
    queryKey: ['analytics', 'threat-review-status', days, sub],
    queryFn: () => fetchThreatReviewStatus(token, days),
    enabled: !!token,
  });

  const riskScoreDistribution = useQuery({
    queryKey: ['analytics', 'risk-score-distribution', days, sub],
    queryFn: () => fetchRiskScoreDistribution(token, days),
    enabled: !!token,
  });

  const topKeywords = useQuery({
    queryKey: ['analytics', 'top-keywords', sub],
    queryFn: () => fetchTopKeywords(token),
    enabled: !!token,
  });

  const workflowHealth = useQuery({
    queryKey: ['analytics', 'workflow-health', days, sub],
    queryFn: () => fetchWorkflowHealth(token, days),
    enabled: !!token,
  });

  const isLoading =
    summary.isLoading ||
    mentionsOverTime.isLoading ||
    sentimentOverTime.isLoading ||
    threatsBySeverity.isLoading ||
    platformDistribution.isLoading ||
    threatCategories.isLoading;

  const error =
    summary.error ||
    mentionsOverTime.error ||
    sentimentOverTime.error ||
    threatsBySeverity.error ||
    platformDistribution.error ||
    threatCategories.error;

  return {
    summary: summary.data,
    summaryLoading: summary.isLoading,
    summaryError: summary.error,

    mentionsOverTime: mentionsOverTime.data ?? [],
    mentionsOverTimeLoading: mentionsOverTime.isLoading,
    mentionsOverTimeError: mentionsOverTime.error,

    sentimentOverTime: sentimentOverTime.data ?? [],
    sentimentOverTimeLoading: sentimentOverTime.isLoading,
    sentimentOverTimeError: sentimentOverTime.error,

    threatsBySeverity: threatsBySeverity.data ?? [],
    threatsBySeverityLoading: threatsBySeverity.isLoading,
    threatsBySeverityError: threatsBySeverity.error,

    platformDistribution: platformDistribution.data ?? [],
    platformDistributionLoading: platformDistribution.isLoading,
    platformDistributionError: platformDistribution.error,

    threatCategories: threatCategories.data ?? [],
    threatCategoriesLoading: threatCategories.isLoading,
    threatCategoriesError: threatCategories.error,

    platformSentiment: platformSentiment.data ?? [],
    platformSentimentLoading: platformSentiment.isLoading,
    platformSentimentError: platformSentiment.error,

    alertHealth: alertHealth.data ?? null,
    alertHealthLoading: alertHealth.isLoading,
    alertHealthError: alertHealth.error,

    threatReviewStatus: threatReviewStatus.data ?? [],
    threatReviewStatusLoading: threatReviewStatus.isLoading,
    threatReviewStatusError: threatReviewStatus.error,

    riskScoreDistribution: riskScoreDistribution.data ?? [],
    riskScoreDistributionLoading: riskScoreDistribution.isLoading,
    riskScoreDistributionError: riskScoreDistribution.error,

    topKeywords: topKeywords.data ?? [],
    topKeywordsLoading: topKeywords.isLoading,
    topKeywordsError: topKeywords.error,

    workflowHealth: workflowHealth.data ?? [],
    workflowHealthLoading: workflowHealth.isLoading,
    workflowHealthError: workflowHealth.error,

    isLoading,
    error,
  };
}
