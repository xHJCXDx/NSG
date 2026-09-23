import { useMemo } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend } from 'recharts';
import type { PlatformSentimentEntry } from '../types';
import { ChartCard } from './ChartCard';
import { useTranslation } from '../../../shared/i18n/translations';
import { useTheme } from '../../../shared/contexts/ThemeContext';

const SENTIMENT_COLORS = {
  positive: '#22c55e',
  neutral: '#6b7280',
  negative: '#ef4444',
};

interface PlatformSentimentChartProps {
  data: PlatformSentimentEntry[];
  isLoading?: boolean;
  error?: unknown;
}

export function PlatformSentimentChart({ data, isLoading, error }: PlatformSentimentChartProps) {
  const t = useTranslation();
  const { theme } = useTheme();

  const sentimentLabels = t.analytics.sentiment as Record<string, string>;

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
      <ChartCard title={t.analytics.charts.platformSentiment}>
        <div className="flex h-[300px] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500/30 border-t-brand-500" />
        </div>
      </ChartCard>
    );
  }

  if (error) {
    return (
      <ChartCard title={t.analytics.charts.platformSentiment}>
        <div className="flex h-[300px] items-center justify-center text-red-400">{t.analytics.error}</div>
      </ChartCard>
    );
  }

  if (data.length === 0) {
    return (
      <ChartCard title={t.analytics.charts.platformSentiment}>
        <div className="flex h-[300px] items-center justify-center text-content-muted">{t.analytics.noData}</div>
      </ChartCard>
    );
  }

  return (
    <ChartCard title={t.analytics.charts.platformSentiment}>
      <div className="h-[300px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ top: 10, right: 30, left: 60, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} horizontal={false} />
            <XAxis type="number" stroke={chartColors.axis} tick={{ fill: chartColors.axis, fontSize: 12 }} axisLine={false} tickLine={false} allowDecimals={false} />
            <YAxis type="category" dataKey="platform" stroke={chartColors.axis} tick={{ fill: chartColors.axis, fontSize: 12 }} axisLine={false} tickLine={false} width={80} />
            <Tooltip
              contentStyle={{
                backgroundColor: chartColors.tooltipBg,
                border: `1px solid ${chartColors.tooltipBorder}`,
                borderRadius: '0.75rem',
                color: chartColors.tooltipText,
              }}
              formatter={(value, name) => {
                return [value, sentimentLabels[String(name)] ?? String(name)];
              }}
              labelFormatter={(label, payload) => {
                const entry = payload?.[0]?.payload as PlatformSentimentEntry | undefined;
                return entry ? `${label} (${entry.total} total)` : label;
              }}
            />
            <Legend formatter={(value: string) => sentimentLabels[value] ?? value} />
            <Bar dataKey="positive" stackId="sentiment" fill={SENTIMENT_COLORS.positive} radius={0} />
            <Bar dataKey="neutral" stackId="sentiment" fill={SENTIMENT_COLORS.neutral} radius={0} />
            <Bar dataKey="negative" stackId="sentiment" fill={SENTIMENT_COLORS.negative} radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  );
}
