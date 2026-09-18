import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { Activity, Bell, KeyRound, ListChecks, ShieldAlert, Zap } from 'lucide-react';
import { DASHBOARD_COPY } from '../contract';
import { KpiCard } from '../components/KpiCard';
import { useDashboardSummary } from '../hooks/useDashboardSummary';

export function Dashboard() {
  const { data, isLoading } = useDashboardSummary();

  const kpiValue = (field: number | undefined) => isLoading ? '-' : (field ?? 0);

  const chartData = data ? [
    { name: 'Threats', value: data.total_threats, fill: '#f87171' },
    { name: 'Pending', value: data.pending_threats, fill: '#fbbf24' },
    { name: 'Alerts', value: data.total_alerts, fill: '#60a5fa' },
    { name: 'Activity', value: data.activity_count, fill: '#34d399' },
  ] : [];

  return (
    <div className="space-y-6">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-white tracking-tight">{DASHBOARD_COPY.page.title}</h1>
        <p className="text-gray-400 mt-2">{DASHBOARD_COPY.page.description}</p>
      </header>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <KpiCard label={DASHBOARD_COPY.kpi.totalThreats} value={kpiValue(data?.total_threats)} icon={Activity} color="brand" />
        <KpiCard label={DASHBOARD_COPY.kpi.pendingThreats} value={kpiValue(data?.pending_threats)} icon={ShieldAlert} color="yellow" />
        <KpiCard label={DASHBOARD_COPY.kpi.totalAlerts} value={kpiValue(data?.total_alerts)} icon={Bell} color="emerald" />
        <KpiCard label={DASHBOARD_COPY.kpi.unacknowledgedAlerts} value={kpiValue(data?.unacknowledged_alerts)} icon={ShieldAlert} color="red" />
        <KpiCard label={DASHBOARD_COPY.kpi.activeKeywords} value={kpiValue(data?.active_keywords)} icon={KeyRound} color="purple" />
        <KpiCard label={DASHBOARD_COPY.kpi.executionLogs} value={kpiValue(data?.execution_logs_count)} icon={ListChecks} color="cyan" />
        <KpiCard label={DASHBOARD_COPY.kpi.activityCount} value={kpiValue(data?.activity_count)} icon={Zap} color="emerald" className="md:col-span-3" />
      </div>

      {/* Charts Area */}
      <div className="glass-card p-6 min-h-[400px]">
        <h2 className="text-xl font-bold text-white mb-6">{DASHBOARD_COPY.chart.title}</h2>
        {isLoading ? (
          <div className="flex items-center justify-center h-[300px]">
            <div className="w-8 h-8 border-4 border-brand-500/30 border-t-brand-500 rounded-full animate-spin"></div>
          </div>
        ) : data ? (
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                <XAxis dataKey="name" stroke="#94a3b8" tick={{ fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis stroke="#94a3b8" tick={{ fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <Tooltip
                  cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                  contentStyle={{ backgroundColor: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '0.75rem', color: '#fff' }}
                />
                <Bar dataKey="value" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="flex items-center justify-center h-[300px] text-gray-400">
            {DASHBOARD_COPY.chart.noData}
          </div>
        )}
      </div>
    </div>
  );
}
