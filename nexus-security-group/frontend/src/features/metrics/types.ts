export interface MetricsSummary {
  total_mentions: number;
  sentiment_distribution: Record<string, number>;
  alerts_count: number;
  avg_sentiment_score: number | null;
}

export interface TimeSeriesPoint {
  date: string;
  count: number;
}

export interface SentimentTimeSeriesPoint {
  date: string;
  positive: number;
  neutral: number;
  negative: number;
}

export interface CategoryCount {
  label: string;
  count: number;
}

export interface WorkflowHealthEntry {
  date: string;
  execution_count: number;
  success_count: number;
  error_count: number;
  avg_duration_seconds: number | null;
  avg_mentions_processed: number | null;
  avg_detections_generated: number | null;
}

export interface PlatformSentimentEntry {
  platform: string;
  positive: number;
  neutral: number;
  negative: number;
  total: number;
}

export interface AlertHealthSummary {
  total: number;
  by_delivery_status: CategoryCount[];
  acknowledged_count: number;
  unacknowledged_count: number;
  acknowledgement_rate: number;
}

export interface RiskScoreBucket {
  bucket: string;
  count: number;
  avg_score: number;
}

export interface TopKeywordEntry {
  keyword: string;
  detection_count: number;
  days_active: number;
  avg_confidence: number;
  high_severity_count: number;
  last_detection: string | null;
}
