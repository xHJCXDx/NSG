import { AlertTriangle, BarChart3, MessageSquare, TrendingUp } from 'lucide-react';
import { KpiCard } from '../../../shared/components/KpiCard';
import { ANALYTICS_COPY } from '../contract';
import type { CategoryCount, MetricsSummary } from '../types';

interface AnalyticsKpiRowProps {
  summary: MetricsSummary | undefined;
  threatsBySeverity: CategoryCount[];
  isLoading: boolean;
}

export function AnalyticsKpiRow({ summary, threatsBySeverity, isLoading }: AnalyticsKpiRowProps) {
  const value = (v: number | undefined) => (isLoading ? '-' : (v ?? 0));

  const totalThreats = threatsBySeverity.reduce((sum, item) => sum + item.count, 0);

  const avgSentiment = summary
    ? (() => {
        const dist = summary.sentiment_distribution;
        const total = (dist.positive ?? 0) + (dist.neutral ?? 0) + (dist.negative ?? 0);
        if (total === 0) return '0.00';
        const score = ((dist.positive ?? 0) - (dist.negative ?? 0)) / total;
        return score.toFixed(2);
      })()
    : '0.00';

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <KpiCard label={ANALYTICS_COPY.kpi.totalMentions} value={value(summary?.total_mentions)} icon={MessageSquare} color="brand" />
      <KpiCard label={ANALYTICS_COPY.kpi.totalAlerts} value={value(summary?.alerts_count)} icon={AlertTriangle} color="red" />
      <KpiCard label={ANALYTICS_COPY.kpi.threatDetections} value={isLoading ? '-' : totalThreats} icon={BarChart3} color="yellow" />
      <KpiCard label={ANALYTICS_COPY.kpi.avgSentiment} value={isLoading ? '-' : avgSentiment} icon={TrendingUp} color="emerald" />
    </div>
  );
}
