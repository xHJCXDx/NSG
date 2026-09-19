import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../auth';
import {
  fetchMentionsOverTime,
  fetchMetricsSummary,
  fetchPlatformDistribution,
  fetchSentimentOverTime,
  fetchThreatCategories,
  fetchThreatsBySeverity,
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
    queryKey: ['analytics', 'threats-by-severity', sub],
    queryFn: () => fetchThreatsBySeverity(token),
    enabled: !!token,
  });

  const platformDistribution = useQuery({
    queryKey: ['analytics', 'platform-distribution', sub],
    queryFn: () => fetchPlatformDistribution(token),
    enabled: !!token,
  });

  const threatCategories = useQuery({
    queryKey: ['analytics', 'threat-categories', sub],
    queryFn: () => fetchThreatCategories(token),
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
    mentionsOverTime: mentionsOverTime.data ?? [],
    sentimentOverTime: sentimentOverTime.data ?? [],
    threatsBySeverity: threatsBySeverity.data ?? [],
    platformDistribution: platformDistribution.data ?? [],
    threatCategories: threatCategories.data ?? [],
    isLoading,
    error,
  };
}
