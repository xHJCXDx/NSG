import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ANALYTICS_COPY } from '../contract';
import type { CategoryCount } from '../types';
import { ChartCard } from './ChartCard';

interface ThreatCategoriesChartProps {
  data: CategoryCount[];
}

export function ThreatCategoriesChart({ data }: ThreatCategoriesChartProps) {
  if (data.length === 0) {
    return (
      <ChartCard title={ANALYTICS_COPY.charts.threatCategories}>
        <div className="flex h-[300px] items-center justify-center text-gray-400">{ANALYTICS_COPY.noData}</div>
      </ChartCard>
    );
  }

  return (
    <ChartCard title={ANALYTICS_COPY.charts.threatCategories}>
      <div className="h-[300px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
            <XAxis dataKey="label" stroke="#94a3b8" tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} />
            <YAxis stroke="#94a3b8" tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} />
            <Tooltip
              contentStyle={{ backgroundColor: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '0.75rem', color: '#fff' }}
            />
            <Bar dataKey="count" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  );
}
