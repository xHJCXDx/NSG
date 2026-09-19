import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { ANALYTICS_COPY } from '../contract';
import type { CategoryCount } from '../types';
import { ChartCard } from './ChartCard';

const PLATFORM_COLORS = ['#0ea5e9', '#8b5cf6', '#f97316', '#22c55e', '#ef4444', '#eab308', '#ec4899'];

interface PlatformDistributionChartProps {
  data: CategoryCount[];
}

export function PlatformDistributionChart({ data }: PlatformDistributionChartProps) {
  if (data.length === 0) {
    return (
      <ChartCard title={ANALYTICS_COPY.charts.platformDistribution}>
        <div className="flex h-[300px] items-center justify-center text-gray-400">{ANALYTICS_COPY.noData}</div>
      </ChartCard>
    );
  }

  return (
    <ChartCard title={ANALYTICS_COPY.charts.platformDistribution}>
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
              contentStyle={{ backgroundColor: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '0.75rem', color: '#fff' }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  );
}
