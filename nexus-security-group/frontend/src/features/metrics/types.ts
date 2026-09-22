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

export interface TopKeywordEntry {
  keyword: string;
  detection_count: number;
  days_active: number;
  avg_confidence: number;
  high_severity_count: number;
  last_detection: string | null;
}
