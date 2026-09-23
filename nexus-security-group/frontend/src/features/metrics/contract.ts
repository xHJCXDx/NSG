export const METRICS_SUMMARY_ENDPOINT = '/api/metrics/summary';
export const MENTIONS_OVER_TIME_ENDPOINT = '/api/metrics/mentions-over-time';
export const SENTIMENT_OVER_TIME_ENDPOINT = '/api/metrics/sentiment-over-time';
export const THREATS_BY_SEVERITY_ENDPOINT = '/api/metrics/threats-by-severity';
export const PLATFORM_DISTRIBUTION_ENDPOINT = '/api/metrics/platform-distribution';
export const THREAT_CATEGORIES_ENDPOINT = '/api/metrics/threat-categories';
export const ALERT_HEALTH_ENDPOINT = '/api/metrics/alert-health';
export const RISK_SCORE_DISTRIBUTION_ENDPOINT = '/api/metrics/risk-score-distribution';
export const THREAT_REVIEW_STATUS_ENDPOINT = '/api/metrics/threat-review-status';
export const TOP_KEYWORDS_ENDPOINT = '/api/metrics/top-keywords';
export const WORKFLOW_HEALTH_ENDPOINT = '/api/metrics/workflow-health';

export const ANALYTICS_COPY = {
  page: {
    eyebrow: 'Intelligence',
    title: 'Analytics',
    description: 'Aggregated metrics and trends from OSINT monitoring across all platforms and threat categories.',
  },
  kpi: {
    totalMentions: 'Total Mentions',
    totalAlerts: 'Total Alerts',
    threatDetections: 'Threat Detections',
    avgSentiment: 'Avg. Sentiment',
  },
  charts: {
    mentionsOverTime: 'Mentions Over Time',
    sentimentTrends: 'Sentiment Trends',
    platformDistribution: 'Platform Distribution',
    threatsBySeverity: 'Threats by Severity',
    threatCategories: 'Threat Categories',
  },
  loading: 'Loading analytics data...',
  error: 'Failed to load analytics data.',
  noData: 'No data available.',
} as const;
