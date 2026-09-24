import { useMemo } from 'react';
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { TopKeywordEntry } from '../types';
import { ChartCard } from './ChartCard';
import { useTranslation } from '../../../shared/i18n/translations';
import { useTheme } from '../../../shared/contexts/ThemeContext';

interface TopKeywordsChartProps {
  data: TopKeywordEntry[];
  isLoading?: boolean;
  error?: unknown;
}

function getBarColor(entry: TopKeywordEntry): string {
  const ratio = entry.detection_count > 0 ? entry.high_severity_count / entry.detection_count : 0;
  if (ratio >= 0.5) return '#ef4444';
  if (ratio >= 0.25) return '#f97316';
  if (ratio > 0) return '#eab308';
  return '#0ea5e9';
}

export function TopKeywordsChart({ data, isLoading, error }: TopKeywordsChartProps) {
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
      <ChartCard title={t.analytics.charts.topKeywords}>
        <div className="flex h-[350px] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500/30 border-t-brand-500" />
        </div>
      </ChartCard>
    );
  }

  if (error) {
    return (
      <ChartCard title={t.analytics.charts.topKeywords}>
        <div className="flex h-[350px] items-center justify-center text-red-400">{t.analytics.error}</div>
      </ChartCard>
    );
  }

  if (data.length === 0) {
    return (
      <ChartCard title={t.analytics.charts.topKeywords}>
        <div className="flex h-[350px] items-center justify-center text-content-muted">{t.analytics.noData}</div>
      </ChartCard>
    );
  }

  const chartHeight = Math.max(350, data.length * 32);

  return (
    <ChartCard title={t.analytics.charts.topKeywords}>
      <div style={{ height: chartHeight }} className="w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ top: 10, right: 30, left: 10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} horizontal={false} />
            <XAxis type="number" stroke={chartColors.axis} tick={{ fill: chartColors.axis, fontSize: 12 }} axisLine={false} tickLine={false} />
            <YAxis
              type="category"
              dataKey="keyword"
              stroke={chartColors.axis}
              tick={{ fill: chartColors.axis, fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              width={120}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: chartColors.tooltipBg,
                border: `1px solid ${chartColors.tooltipBorder}`,
                borderRadius: '0.75rem',
                color: chartColors.tooltipText,
              }}
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const entry = payload[0].payload as TopKeywordEntry;
                return (
                  <div style={{
                    backgroundColor: chartColors.tooltipBg,
                    border: `1px solid ${chartColors.tooltipBorder}`,
                    borderRadius: '0.75rem',
                    color: chartColors.tooltipText,
                    padding: '0.5rem 0.75rem',
                    fontSize: '0.8rem',
                  }}>
                    <p style={{ fontWeight: 600, marginBottom: '0.25rem' }}>{entry.keyword}</p>
                    <p>{t.analytics.tooltips.detections}: {entry.detection_count}</p>
                    <p>{t.analytics.tooltips.highSeverity}: {entry.high_severity_count}</p>
                    <p>{t.analytics.tooltips.daysActive}: {entry.days_active}</p>
                    <p>{t.analytics.tooltips.confidence}: {(entry.avg_confidence * 100).toFixed(0)}%</p>
                    <p>{t.analytics.tooltips.lastDetection}: {entry.last_detection ? new Date(entry.last_detection).toLocaleDateString() : '—'}</p>
                  </div>
                );
              }}
            />
            <Bar dataKey="detection_count" radius={[0, 4, 4, 0]}>
              {data.map((entry) => (
                <Cell key={entry.keyword} fill={getBarColor(entry)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  );
}
