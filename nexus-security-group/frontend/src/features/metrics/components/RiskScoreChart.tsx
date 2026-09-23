import { useMemo } from 'react';
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { RiskScoreBucket } from '../types';
import { ChartCard } from './ChartCard';
import { useTranslation } from '../../../shared/i18n/translations';
import { useTheme } from '../../../shared/contexts/ThemeContext';

const BUCKET_COLORS: Record<string, string> = {
  '0-10': '#22c55e',
  '11-20': '#4ade80',
  '21-30': '#86efac',
  '31-40': '#bef264',
  '41-50': '#facc15',
  '51-60': '#fbbf24',
  '61-70': '#fb923c',
  '71-80': '#f97316',
  '81-90': '#ef4444',
  '91-100': '#dc2626',
};

interface RiskScoreChartProps {
  data: RiskScoreBucket[];
  isLoading?: boolean;
  error?: unknown;
}

export function RiskScoreChart({ data, isLoading, error }: RiskScoreChartProps) {
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
      <ChartCard title={t.analytics.charts.riskScoreDistribution}>
        <div className="flex h-[300px] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500/30 border-t-brand-500" />
        </div>
      </ChartCard>
    );
  }

  if (error) {
    return (
      <ChartCard title={t.analytics.charts.riskScoreDistribution}>
        <div className="flex h-[300px] items-center justify-center text-red-400">{t.analytics.error}</div>
      </ChartCard>
    );
  }

  if (data.length === 0) {
    return (
      <ChartCard title={t.analytics.charts.riskScoreDistribution}>
        <div className="flex h-[300px] items-center justify-center text-content-muted">{t.analytics.noData}</div>
      </ChartCard>
    );
  }

  return (
    <ChartCard title={t.analytics.charts.riskScoreDistribution}>
      <div className="h-[300px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 10, right: 30, left: 10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} horizontal={true} vertical={false} />
            <XAxis
              dataKey="bucket"
              stroke={chartColors.axis}
              tick={{ fill: chartColors.axis, fontSize: 11 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              stroke={chartColors.axis}
              tick={{ fill: chartColors.axis, fontSize: 12 }}
              axisLine={false}
              tickLine={false}
              allowDecimals={false}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: chartColors.tooltipBg,
                border: `1px solid ${chartColors.tooltipBorder}`,
                borderRadius: '0.75rem',
                color: chartColors.tooltipText,
              }}
              formatter={(value, name) => {
                if (name === 'count') return [value, t.analytics.tooltips.detections];
                return [value, String(name)];
              }}
              labelFormatter={(label, payload) => {
                const entry = payload?.[0]?.payload as RiskScoreBucket | undefined;
                const avgLabel = `${t.analytics.tooltips.avgScore}: ${entry?.avg_score ?? '—'}`;
                return `${t.analytics.tooltips.riskRange}: ${label}\n${avgLabel}`;
              }}
            />
            <Bar dataKey="count" radius={[4, 4, 0, 0]}>
              {data.map((entry) => (
                <Cell key={entry.bucket} fill={BUCKET_COLORS[entry.bucket] ?? '#6b7280'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  );
}
