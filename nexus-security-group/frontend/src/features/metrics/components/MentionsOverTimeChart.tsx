import { useMemo } from 'react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { TimeSeriesPoint } from '../types';
import { ChartCard } from './ChartCard';
import { useTranslation } from '../../../shared/i18n/translations';
import { useTheme } from '../../../shared/contexts/ThemeContext';

interface MentionsOverTimeChartProps {
  data: TimeSeriesPoint[];
  isLoading?: boolean;
  error?: unknown;
}

export function MentionsOverTimeChart({ data, isLoading, error }: MentionsOverTimeChartProps) {
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
      <ChartCard title={t.analytics.charts.mentionsOverTime}>
        <div className="flex h-[300px] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500/30 border-t-brand-500" />
        </div>
      </ChartCard>
    );
  }

  if (error) {
    return (
      <ChartCard title={t.analytics.charts.mentionsOverTime}>
        <div className="flex h-[300px] items-center justify-center text-red-400">{t.analytics.error}</div>
      </ChartCard>
    );
  }

  if (data.length === 0) {
    return (
      <ChartCard title={t.analytics.charts.mentionsOverTime}>
        <div className="flex h-[300px] items-center justify-center text-content-muted">{t.analytics.noData}</div>
      </ChartCard>
    );
  }

  return (
    <ChartCard title={t.analytics.charts.mentionsOverTime}>
      <div className="h-[300px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="mentionsGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} vertical={false} />
            <XAxis dataKey="date" stroke={chartColors.axis} tick={{ fill: chartColors.axis, fontSize: 12 }} axisLine={false} tickLine={false} />
            <YAxis stroke={chartColors.axis} tick={{ fill: chartColors.axis, fontSize: 12 }} axisLine={false} tickLine={false} />
            <Tooltip
              contentStyle={{ backgroundColor: chartColors.tooltipBg, border: `1px solid ${chartColors.tooltipBorder}`, borderRadius: '0.75rem', color: chartColors.tooltipText }}
            />
            <Area type="monotone" dataKey="count" stroke="#0ea5e9" fill="url(#mentionsGradient)" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  );
}
