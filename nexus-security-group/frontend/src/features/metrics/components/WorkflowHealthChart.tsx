import { useMemo } from 'react';
import { Area, AreaChart, CartesianGrid, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { WorkflowHealthEntry } from '../types';
import { ChartCard } from './ChartCard';
import { useTranslation } from '../../../shared/i18n/translations';
import { useTheme } from '../../../shared/contexts/ThemeContext';

interface WorkflowHealthChartProps {
  data: WorkflowHealthEntry[];
  isLoading?: boolean;
  error?: unknown;
}

export function WorkflowHealthChart({ data, isLoading, error }: WorkflowHealthChartProps) {
  const t = useTranslation();
  const { theme } = useTheme();

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

  if (isLoading) {
    return (
      <ChartCard title={t.analytics.charts.workflowHealth}>
        <div className="flex h-[300px] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500/30 border-t-brand-500" />
        </div>
      </ChartCard>
    );
  }

  if (error) {
    return (
      <ChartCard title={t.analytics.charts.workflowHealth}>
        <div className="flex h-[300px] items-center justify-center text-red-400">{t.analytics.error}</div>
      </ChartCard>
    );
  }

  if (data.length === 0) {
    return (
      <ChartCard title={t.analytics.charts.workflowHealth}>
        <div className="flex h-[300px] items-center justify-center text-content-muted">{t.analytics.noData}</div>
      </ChartCard>
    );
  }

  return (
    <ChartCard title={t.analytics.charts.workflowHealth}>
      <div className="h-[300px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="successGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="errorGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} vertical={false} />
            <XAxis dataKey="date" stroke={chartColors.axis} tick={{ fill: chartColors.axis, fontSize: 12 }} axisLine={false} tickLine={false} />
            <YAxis yAxisId="left" stroke={chartColors.axis} tick={{ fill: chartColors.axis, fontSize: 12 }} axisLine={false} tickLine={false} allowDecimals={false} />
            <YAxis yAxisId="right" orientation="right" stroke={chartColors.axis} tick={{ fill: chartColors.axis, fontSize: 12 }} axisLine={false} tickLine={false} />
            <Tooltip
              contentStyle={{
                backgroundColor: chartColors.tooltipBg,
                border: `1px solid ${chartColors.tooltipBorder}`,
                borderRadius: '0.75rem',
                color: chartColors.tooltipText,
              }}
              content={({ active, payload, label }) => {
                if (!active || !payload?.length) return null;
                const entry = payload[0].payload as WorkflowHealthEntry;
                return (
                  <div style={{
                    backgroundColor: chartColors.tooltipBg,
                    border: `1px solid ${chartColors.tooltipBorder}`,
                    borderRadius: '0.75rem',
                    color: chartColors.tooltipText,
                    padding: '0.5rem 0.75rem',
                    fontSize: '0.8rem',
                  }}>
                    <p style={{ fontWeight: 600, marginBottom: '0.25rem' }}>{label}</p>
                    <p style={{ color: '#22c55e' }}>{t.analytics.tooltips.success}: {entry.success_count}</p>
                    <p style={{ color: '#ef4444' }}>{t.analytics.tooltips.errors}: {entry.error_count}</p>
                    <p>{t.analytics.tooltips.duration}: {entry.avg_duration_seconds?.toFixed(1)}s</p>
                    <p style={{ color: '#a78bfa' }}>{t.analytics.tooltips.mentionsProcessed}: {entry.avg_mentions_processed?.toFixed(1)}</p>
                    <p style={{ color: '#fb923c' }}>{t.analytics.tooltips.detectionsGenerated}: {entry.avg_detections_generated?.toFixed(1)}</p>
                  </div>
                );
              }}
            />
            <Legend
              wrapperStyle={{ color: 'var(--color-content-secondary)' }}
              formatter={(value: string) => {
                const labels: Record<string, string> = {
                  success_count: t.analytics.tooltips.success,
                  error_count: t.analytics.tooltips.errors,
                  avg_mentions_processed: t.analytics.tooltips.mentionsProcessed,
                  avg_detections_generated: t.analytics.tooltips.detectionsGenerated,
                };
                return labels[value] ?? value;
              }}
            />
            <Area yAxisId="left" type="monotone" dataKey="success_count" stackId="1" stroke="#22c55e" fill="url(#successGradient)" strokeWidth={2} />
            <Area yAxisId="left" type="monotone" dataKey="error_count" stackId="1" stroke="#ef4444" fill="url(#errorGradient)" strokeWidth={2} />
            <Line yAxisId="right" type="monotone" dataKey="avg_mentions_processed" stroke="#a78bfa" strokeWidth={2} dot={false} strokeDasharray="5 3" />
            <Line yAxisId="right" type="monotone" dataKey="avg_detections_generated" stroke="#fb923c" strokeWidth={2} dot={false} strokeDasharray="5 3" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  );
}
