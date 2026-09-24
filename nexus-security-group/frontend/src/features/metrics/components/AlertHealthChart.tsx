import { useMemo } from 'react';
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import type { AlertHealthSummary } from '../types';
import { ChartCard } from './ChartCard';
import { useTranslation } from '../../../shared/i18n/translations';
import { useTheme } from '../../../shared/contexts/ThemeContext';

const DELIVERY_COLORS: Record<string, string> = {
  delivered: '#22c55e',
  sent: '#3b82f6',
  pending: '#eab308',
  failed: '#ef4444',
};

interface AlertHealthChartProps {
  data: AlertHealthSummary | null;
  isLoading?: boolean;
  error?: unknown;
}

export function AlertHealthChart({ data, isLoading, error }: AlertHealthChartProps) {
  const t = useTranslation();
  const { theme } = useTheme();

  const deliveryLabels = t.analytics.deliveryStatus as Record<string, string>;
  const formatLabel = (raw: string) => deliveryLabels[raw] ?? raw.charAt(0).toUpperCase() + raw.slice(1);

  const chartColors = useMemo(() => {
    const s = getComputedStyle(document.documentElement);
    return {
      tooltipBg: s.getPropertyValue('--color-chart-tooltip-bg').trim(),
      tooltipText: s.getPropertyValue('--color-chart-tooltip-text').trim(),
      tooltipBorder: s.getPropertyValue('--color-chart-tooltip-border').trim(),
    };
  }, [theme]);

  if (isLoading) {
    return (
      <ChartCard title={t.analytics.charts.alertHealth}>
        <div className="flex h-[300px] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500/30 border-t-brand-500" />
        </div>
      </ChartCard>
    );
  }

  if (error) {
    return (
      <ChartCard title={t.analytics.charts.alertHealth}>
        <div className="flex h-[300px] items-center justify-center text-red-400">{t.analytics.error}</div>
      </ChartCard>
    );
  }

  if (!data || data.total === 0) {
    return (
      <ChartCard title={t.analytics.charts.alertHealth}>
        <div className="flex h-[300px] items-center justify-center text-content-muted">{t.analytics.noData}</div>
      </ChartCard>
    );
  }

  const pieData = data.by_delivery_status.map(d => ({
    ...d,
    displayLabel: formatLabel(d.label),
  }));

  const ackPct = (data.acknowledgement_rate * 100).toFixed(1);

  return (
    <ChartCard title={t.analytics.charts.alertHealth}>
      <div className="flex h-[300px] w-full items-center">
        <div className="flex-1">
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie
                data={pieData}
                dataKey="count"
                nameKey="displayLabel"
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={90}
                paddingAngle={2}
              >
                {pieData.map((entry) => (
                  <Cell key={entry.label} fill={DELIVERY_COLORS[entry.label] ?? '#6b7280'} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: chartColors.tooltipBg,
                  border: `1px solid ${chartColors.tooltipBorder}`,
                  borderRadius: '0.75rem',
                  color: chartColors.tooltipText,
                }}
                formatter={(value, name) => {
                  const v = Number(value);
                  const pct = data.total > 0 ? ((v / data.total) * 100).toFixed(1) : '0';
                  return [`${v} (${pct}%)`, String(name)];
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="flex flex-col gap-3 pr-4 text-sm">
          <div>
            <p className="text-content-muted">{t.analytics.tooltips.total}</p>
            <p className="text-2xl font-bold text-content-heading">{data.total}</p>
          </div>
          <div>
            <p className="text-content-muted">{t.analytics.tooltips.ackRate}</p>
            <p className="text-2xl font-bold text-content-heading">{ackPct}%</p>
          </div>
          <div className="flex gap-4 text-xs text-content-muted">
            <span className="text-green-400">{data.acknowledged_count} {t.analytics.tooltips.acknowledged}</span>
            <span className="text-yellow-400">{data.unacknowledged_count} {t.analytics.tooltips.unacknowledged}</span>
          </div>
        </div>
      </div>
    </ChartCard>
  );
}
