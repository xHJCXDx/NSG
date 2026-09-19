import { useAnalytics } from '../hooks/useAnalytics';
import { AnalyticsKpiRow } from '../components/AnalyticsKpiRow';
import { MentionsOverTimeChart } from '../components/MentionsOverTimeChart';
import { SentimentTrendChart } from '../components/SentimentTrendChart';
import { ThreatsBySeverityChart } from '../components/ThreatsBySeverityChart';
import { PlatformDistributionChart } from '../components/PlatformDistributionChart';
import { ThreatCategoriesChart } from '../components/ThreatCategoriesChart';
import { useTranslation } from '../../../shared/i18n/translations';

export function AnalyticsPage() {
  const t = useTranslation();
  const analytics = useAnalytics();

  if (analytics.error) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="text-red-400">{t.analytics.error}</p>
      </div>
    );
  }

  return (
    <section className="space-y-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-wide text-brand-400">{t.analytics.eyebrow}</p>
        <h1 className="mt-2 text-3xl font-bold text-content-heading">{t.analytics.title}</h1>
        <p className="mt-2 max-w-3xl text-content-secondary">{t.analytics.description}</p>
      </div>

      {analytics.isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500/30 border-t-brand-500" />
        </div>
      ) : (
        <>
          <AnalyticsKpiRow summary={analytics.summary} threatsBySeverity={analytics.threatsBySeverity} isLoading={false} />
          <MentionsOverTimeChart data={analytics.mentionsOverTime} />
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <SentimentTrendChart data={analytics.sentimentOverTime} />
            <PlatformDistributionChart data={analytics.platformDistribution} />
          </div>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <ThreatsBySeverityChart data={analytics.threatsBySeverity} />
            <ThreatCategoriesChart data={analytics.threatCategories} />
          </div>
        </>
      )}
    </section>
  );
}
