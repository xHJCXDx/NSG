import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { Activity, Bell, KeyRound, ListChecks, ShieldAlert, Zap } from 'lucide-react';
import { KpiCard } from '../../../shared/components/KpiCard';
import { useDashboardSummary } from '../hooks/useDashboardSummary';
import { useTranslation } from '../../../shared/i18n/translations';
import { useTheme } from '../../../shared/contexts/ThemeContext';

export function Dashboard() {
  const t = useTranslation();
  const { data, isLoading, dataUpdatedAt } = useDashboardSummary();
  const { theme } = useTheme();

  const kpiValue = (field: number | undefined) => isLoading ? '-' : (field ?? 0);

  const chartColors = useMemo(() => {
    const s = getComputedStyle(document.documentElement);
    return {
      grid: s.getPropertyValue('--color-chart-grid').trim(),
      axis: s.getPropertyValue('--color-chart-axis').trim(),
      tooltipBg: s.getPropertyValue('--color-chart-tooltip-bg').trim(),
      tooltipText: s.getPropertyValue('--color-chart-tooltip-text').trim(),
      tooltipBorder: s.getPropertyValue('--color-chart-tooltip-border').trim(),
    };
  }, [theme]);

  const chartData = data ? [
    { name: t.dashboard.chart.bars.threats, value: data.total_threats, fill: '#f87171' },
    { name: t.dashboard.chart.bars.pending, value: data.pending_threats, fill: '#fbbf24' },
    { name: t.dashboard.chart.bars.alerts, value: data.total_alerts, fill: '#60a5fa' },
    { name: t.dashboard.chart.bars.activity, value: data.activity_count, fill: '#34d399' },
  ] : [];

  return (
    <div className="space-y-6">
      <header className="mb-8">
        <div className="flex items-baseline justify-between">
          <h1 className="text-3xl font-bold text-content-heading tracking-tight">{t.dashboard.title}</h1>
          {dataUpdatedAt > 0 && (
            <span className="text-xs text-content-muted">
              {t.dashboard.lastUpdated}: {new Date(dataUpdatedAt).toLocaleTimeString()}
            </span>
          )}
        </div>
        <p className="text-content-secondary mt-2">{t.dashboard.description}</p>
      </header>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <KpiCard label={t.dashboard.kpi.totalThreats} value={kpiValue(data?.total_threats)} icon={Activity} color="brand" />
        <KpiCard label={t.dashboard.kpi.pendingThreats} value={kpiValue(data?.pending_threats)} icon={ShieldAlert} color="yellow" />
        <KpiCard label={t.dashboard.kpi.totalAlerts} value={kpiValue(data?.total_alerts)} icon={Bell} color="emerald" />
        <KpiCard label={t.dashboard.kpi.unacknowledgedAlerts} value={kpiValue(data?.unacknowledged_alerts)} icon={ShieldAlert} color="red" />
        <KpiCard label={t.dashboard.kpi.activeKeywords} value={kpiValue(data?.active_keywords)} icon={KeyRound} color="purple" />
        <KpiCard label={t.dashboard.kpi.executionLogs} value={kpiValue(data?.execution_logs_count)} icon={ListChecks} color="cyan" />
        <KpiCard label={t.dashboard.kpi.activityCount} value={kpiValue(data?.activity_count)} icon={Zap} color="emerald" className="md:col-span-3" />
      </div>

      {/* Charts Area */}
      <div className="glass-card p-6 min-h-[400px]">
        <h2 className="text-xl font-bold text-content-heading mb-6">{t.dashboard.chart.title}</h2>
        {isLoading ? (
          <div className="flex items-center justify-center h-[300px]">
            <div className="w-8 h-8 border-4 border-brand-500/30 border-t-brand-500 rounded-full animate-spin"></div>
          </div>
        ) : data ? (
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} vertical={false} />
                <XAxis dataKey="name" stroke={chartColors.axis} tick={{ fill: chartColors.axis }} axisLine={false} tickLine={false} />
                <YAxis stroke={chartColors.axis} tick={{ fill: chartColors.axis }} axisLine={false} tickLine={false} />
                <Tooltip
                  cursor={{ fill: 'rgba(128,128,128,0.08)' }}
                  contentStyle={{ backgroundColor: chartColors.tooltipBg, border: `1px solid ${chartColors.tooltipBorder}`, borderRadius: '0.75rem', color: chartColors.tooltipText }}
                />
                <Bar dataKey="value" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="flex items-center justify-center h-[300px] text-content-muted">
            {t.dashboard.chart.noData}
          </div>
        )}
      </div>
    </div>
  );
}
