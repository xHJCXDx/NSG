import { useMemo } from 'react';
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { CategoryCount } from '../types';
import { ChartCard } from './ChartCard';
import { useTranslation } from '../../../shared/i18n/translations';
import { useTheme } from '../../../shared/contexts/ThemeContext';

const CATEGORY_COLORS: Record<string, string> = {
  malware: '#ef4444',
  data_breach: '#f97316',
  phishing: '#eab308',
  vulnerability: '#0ea5e9',
  advanced_threat: '#8b5cf6',
  ddos: '#ec4899',
  supply_chain: '#14b8a6',
  critical_incident: '#dc2626',
  security_threat: '#f59e0b',
  other: '#6b7280',
};

interface ThreatCategoriesChartProps {
  data: CategoryCount[];
  isLoading?: boolean;
  error?: unknown;
}

export function ThreatCategoriesChart({ data, isLoading, error }: ThreatCategoriesChartProps) {
  const t = useTranslation();
  const { theme } = useTheme();

  const categoryLabels = t.analytics.category as Record<string, string>;
  const formatLabel = (raw: string) => categoryLabels[raw] ?? raw.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

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

  const formattedData = useMemo(
    () => data.map(d => ({ ...d, displayLabel: formatLabel(d.label) })),
    [data, categoryLabels],
  );

  if (isLoading) {
    return (
      <ChartCard title={t.analytics.charts.threatCategories}>
        <div className="flex h-[300px] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500/30 border-t-brand-500" />
        </div>
      </ChartCard>
    );
  }

  if (error) {
    return (
      <ChartCard title={t.analytics.charts.threatCategories}>
        <div className="flex h-[300px] items-center justify-center text-red-400">{t.analytics.error}</div>
      </ChartCard>
    );
  }

  if (data.length === 0) {
    return (
      <ChartCard title={t.analytics.charts.threatCategories}>
        <div className="flex h-[300px] items-center justify-center text-content-muted">{t.analytics.noData}</div>
      </ChartCard>
    );
  }

  return (
    <ChartCard title={t.analytics.charts.threatCategories}>
      <div className="h-[300px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={formattedData} layout="vertical" margin={{ top: 10, right: 30, left: 80, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} horizontal={false} />
            <XAxis type="number" stroke={chartColors.axis} tick={{ fill: chartColors.axis, fontSize: 12 }} axisLine={false} tickLine={false} allowDecimals={false} />
            <YAxis type="category" dataKey="displayLabel" stroke={chartColors.axis} tick={{ fill: chartColors.axis, fontSize: 12 }} axisLine={false} tickLine={false} width={80} />
            <Tooltip
              contentStyle={{ backgroundColor: chartColors.tooltipBg, border: `1px solid ${chartColors.tooltipBorder}`, borderRadius: '0.75rem', color: chartColors.tooltipText }}
              labelFormatter={(_, payload) => payload[0]?.payload?.displayLabel ?? ''}
            />
            <Bar dataKey="count" radius={[0, 4, 4, 0]}>
              {formattedData.map((entry) => (
                <Cell key={entry.label} fill={CATEGORY_COLORS[entry.label] ?? '#6b7280'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  );
}
