import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ANALYTICS_COPY } from '../contract';
import type { SentimentTimeSeriesPoint } from '../types';
import { ChartCard } from './ChartCard';

interface SentimentTrendChartProps {
  data: SentimentTimeSeriesPoint[];
}

export function SentimentTrendChart({ data }: SentimentTrendChartProps) {
  if (data.length === 0) {
    return (
      <ChartCard title={ANALYTICS_COPY.charts.sentimentTrends}>
        <div className="flex h-[300px] items-center justify-center text-gray-400">{ANALYTICS_COPY.noData}</div>
      </ChartCard>
    );
  }

  return (
    <ChartCard title={ANALYTICS_COPY.charts.sentimentTrends}>
      <div className="h-[300px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="positiveGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#34d399" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#34d399" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="neutralGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#94a3b8" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#94a3b8" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="negativeGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f87171" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#f87171" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
            <XAxis dataKey="date" stroke="#94a3b8" tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} />
            <YAxis stroke="#94a3b8" tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} />
            <Tooltip
              contentStyle={{ backgroundColor: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '0.75rem', color: '#fff' }}
            />
            <Area type="monotone" dataKey="positive" stackId="1" stroke="#34d399" fill="url(#positiveGradient)" strokeWidth={2} />
            <Area type="monotone" dataKey="neutral" stackId="1" stroke="#94a3b8" fill="url(#neutralGradient)" strokeWidth={2} />
            <Area type="monotone" dataKey="negative" stackId="1" stroke="#f87171" fill="url(#negativeGradient)" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  );
}
