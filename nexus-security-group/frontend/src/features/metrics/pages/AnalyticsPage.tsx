import { useState } from 'react';
import { useAnalytics } from '../hooks/useAnalytics';
import { AnalyticsKpiRow } from '../components/AnalyticsKpiRow';
import { MentionsOverTimeChart } from '../components/MentionsOverTimeChart';
import { SentimentTrendChart } from '../components/SentimentTrendChart';
import { ThreatsBySeverityChart } from '../components/ThreatsBySeverityChart';
import { PlatformDistributionChart } from '../components/PlatformDistributionChart';
import { ThreatCategoriesChart } from '../components/ThreatCategoriesChart';
import { RiskScoreChart } from '../components/RiskScoreChart';
import { ThreatReviewChart } from '../components/ThreatReviewChart';
import { TopKeywordsChart } from '../components/TopKeywordsChart';
import { WorkflowHealthChart } from '../components/WorkflowHealthChart';
import { useTranslation } from '../../../shared/i18n/translations';

const TIME_RANGE_OPTIONS = [7, 30, 90] as const;
type TimeRange = (typeof TIME_RANGE_OPTIONS)[number];

export function AnalyticsPage() {
  const t = useTranslation();
  const [days, setDays] = useState<TimeRange>(30);
  const analytics = useAnalytics(days);

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-brand-400">{t.analytics.eyebrow}</p>
          <h1 className="mt-2 text-3xl font-bold text-content-heading">{t.analytics.title}</h1>
          <p className="mt-2 max-w-3xl text-content-secondary">{t.analytics.description}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-content-secondary">{t.analytics.timeRange.label}</span>
          <div className="flex rounded-lg border border-white/10 overflow-hidden">
            {TIME_RANGE_OPTIONS.map((option) => {
              const label = t.analytics.timeRange[`days${option}` as keyof typeof t.analytics.timeRange] as string;
              return (
                <button
                  key={option}
                  onClick={() => setDays(option)}
                  className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                    days === option
                      ? 'bg-brand-500 text-white'
                      : 'text-content-secondary hover:bg-white/5'
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <AnalyticsKpiRow
        summary={analytics.summary}
        threatsBySeverity={analytics.threatsBySeverity}
        isLoading={analytics.summaryLoading || analytics.threatsBySeverityLoading}
      />
      <MentionsOverTimeChart
        data={analytics.mentionsOverTime}
        isLoading={analytics.mentionsOverTimeLoading}
        error={analytics.mentionsOverTimeError}
      />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <SentimentTrendChart
          data={analytics.sentimentOverTime}
          isLoading={analytics.sentimentOverTimeLoading}
          error={analytics.sentimentOverTimeError}
        />
        <PlatformDistributionChart
          data={analytics.platformDistribution}
          isLoading={analytics.platformDistributionLoading}
          error={analytics.platformDistributionError}
        />
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <ThreatsBySeverityChart
          data={analytics.threatsBySeverity}
          isLoading={analytics.threatsBySeverityLoading}
          error={analytics.threatsBySeverityError}
        />
        <RiskScoreChart
          data={analytics.riskScoreDistribution}
          isLoading={analytics.riskScoreDistributionLoading}
          error={analytics.riskScoreDistributionError}
        />
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <ThreatCategoriesChart
          data={analytics.threatCategories}
          isLoading={analytics.threatCategoriesLoading}
          error={analytics.threatCategoriesError}
        />
        <ThreatReviewChart
          data={analytics.threatReviewStatus}
          isLoading={analytics.threatReviewStatusLoading}
          error={analytics.threatReviewStatusError}
        />
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <TopKeywordsChart
          data={analytics.topKeywords}
          isLoading={analytics.topKeywordsLoading}
          error={analytics.topKeywordsError}
        />
        <WorkflowHealthChart
          data={analytics.workflowHealth}
          isLoading={analytics.workflowHealthLoading}
          error={analytics.workflowHealthError}
        />
      </div>
    </section>
  );
}
