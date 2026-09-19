import { useMemo } from 'react';
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import type { CategoryCount } from '../types';
import { ChartCard } from './ChartCard';
import { useTranslation } from '../../../shared/i18n/translations';
import { useTheme } from '../../../shared/contexts/ThemeContext';

const PLATFORM_COLORS = ['#0ea5e9', '#8b5cf6', '#f97316', '#22c55e', '#ef4444', '#eab308', '#ec4899'];

interface PlatformDistributionChartProps {
  data: CategoryCount[];
}

export function PlatformDistributionChart({ data }: PlatformDistributionChartProps) {
  const t = useTranslation();
  const { theme } = useTheme();

  const chartColors = useMemo(() => {
    const s = getComputedStyle(document.documentElement);
    return {
      tooltipBg: s.getPropertyValue('--color-chart-tooltip-bg').trim(),
      tooltipText: s.getPropertyValue('--color-chart-tooltip-text').trim(),
      tooltipBorder: s.getPropertyValue('--color-chart-tooltip-border').trim(),
    };
  }, [theme]);

  if (data.length === 0) {
    return (
      <ChartCard title={t.analytics.charts.platformDistribution}>
        <div className="flex h-[300px] items-center justify-center text-content-muted">{t.analytics.noData}</div>
      </ChartCard>
    );
  }

  return (
    <ChartCard title={t.analytics.charts.platformDistribution}>
      <div className="h-[300px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="count"
              nameKey="label"
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={110}
              paddingAngle={2}
              strokeWidth={0}
            >
              {data.map((entry, index) => (
                <Cell key={entry.label} fill={PLATFORM_COLORS[index % PLATFORM_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{ backgroundColor: chartColors.tooltipBg, border: `1px solid ${chartColors.tooltipBorder}`, borderRadius: '0.75rem', color: chartColors.tooltipText }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  );
}
