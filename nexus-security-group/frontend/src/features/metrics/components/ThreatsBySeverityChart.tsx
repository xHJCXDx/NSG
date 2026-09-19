import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ANALYTICS_COPY } from '../contract';
import type { CategoryCount } from '../types';
import { ChartCard } from './ChartCard';

const SEVERITY_COLORS: Record<string, string> = {
  critical: '#ef4444',
  high: '#f97316',
  medium: '#eab308',
  low: '#22c55e',
};

interface ThreatsBySeverityChartProps {
  data: CategoryCount[];
}

export function ThreatsBySeverityChart({ data }: ThreatsBySeverityChartProps) {
  if (data.length === 0) {
    return (
      <ChartCard title={ANALYTICS_COPY.charts.threatsBySeverity}>
        <div className="flex h-[300px] items-center justify-center text-gray-400">{ANALYTICS_COPY.noData}</div>
      </ChartCard>
    );
  }

  return (
    <ChartCard title={ANALYTICS_COPY.charts.threatsBySeverity}>
      <div className="h-[300px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ top: 10, right: 30, left: 60, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" horizontal={false} />
            <XAxis type="number" stroke="#94a3b8" tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} />
            <YAxis type="category" dataKey="label" stroke="#94a3b8" tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} width={80} />
            <Tooltip
              contentStyle={{ backgroundColor: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '0.75rem', color: '#fff' }}
            />
            <Bar dataKey="count" radius={[0, 4, 4, 0]}>
              {data.map((entry) => (
                <Cell key={entry.label} fill={SEVERITY_COLORS[entry.label] ?? '#6b7280'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  );
}
