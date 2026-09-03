import { useEffect, useState } from 'react';
import { useAuth } from '../../auth';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { Activity, Bell, KeyRound, ListChecks, ShieldAlert, Zap } from 'lucide-react';
import { fetchDashboardSummary, type DashboardSummaryResponse } from '../api';
import { DASHBOARD_COPY } from '../contract';

export function Dashboard() {
  const { token } = useAuth();
  const [data, setData] = useState<DashboardSummaryResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const json = await fetchDashboardSummary(token);
        if (json) {
          setData(json);
        }
      } catch (err) {
        console.error('Failed to fetch metrics', err);
      } finally {
        setLoading(false);
      }
    };
    fetchMetrics();
  }, [token]);

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
        <div className="glass-card p-6 flex items-start justify-between group">
          <div>
            <p className="text-sm font-medium text-gray-400 mb-1">{DASHBOARD_COPY.kpi.totalThreats}</p>
            <h3 className="text-3xl font-bold text-white">
              {loading ? '-' : (data?.total_threats ?? 0)}
            </h3>
          </div>
          <div className="w-12 h-12 rounded-xl bg-brand-500/20 flex items-center justify-center border border-brand-500/30 group-hover:scale-110 transition-transform">
            <Activity className="w-6 h-6 text-brand-400" />
          </div>
        </div>

        <div className="glass-card p-6 flex items-start justify-between group">
          <div>
            <p className="text-sm font-medium text-gray-400 mb-1">{DASHBOARD_COPY.kpi.pendingThreats}</p>
            <h3 className="text-3xl font-bold text-white">
              {loading ? '-' : (data?.pending_threats ?? 0)}
            </h3>
          </div>
          <div className="w-12 h-12 rounded-xl bg-yellow-500/20 flex items-center justify-center border border-yellow-500/30 group-hover:scale-110 transition-transform">
            <ShieldAlert className="w-6 h-6 text-yellow-400" />
          </div>
        </div>

        <div className="glass-card p-6 flex items-start justify-between group">
          <div>
            <p className="text-sm font-medium text-gray-400 mb-1">{DASHBOARD_COPY.kpi.totalAlerts}</p>
            <h3 className="text-3xl font-bold text-white">
              {loading ? '-' : (data?.total_alerts ?? 0)}
            </h3>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center border border-emerald-500/30 group-hover:scale-110 transition-transform">
            <Bell className="w-6 h-6 text-emerald-400" />
          </div>
        </div>

        <div className="glass-card p-6 flex items-start justify-between group">
          <div>
            <p className="text-sm font-medium text-gray-400 mb-1">{DASHBOARD_COPY.kpi.unacknowledgedAlerts}</p>
            <h3 className="text-3xl font-bold text-white">
              {loading ? '-' : (data?.unacknowledged_alerts ?? 0)}
            </h3>
          </div>
          <div className="w-12 h-12 rounded-xl bg-red-500/20 flex items-center justify-center border border-red-500/30 group-hover:scale-110 transition-transform">
            <ShieldAlert className="w-6 h-6 text-red-400" />
          </div>
        </div>

        <div className="glass-card p-6 flex items-start justify-between group">
          <div>
            <p className="text-sm font-medium text-gray-400 mb-1">{DASHBOARD_COPY.kpi.activeKeywords}</p>
            <h3 className="text-3xl font-bold text-white">
              {loading ? '-' : (data?.active_keywords ?? 0)}
            </h3>
          </div>
          <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center border border-purple-500/30 group-hover:scale-110 transition-transform">
            <KeyRound className="w-6 h-6 text-purple-400" />
          </div>
        </div>

        <div className="glass-card p-6 flex items-start justify-between group">
          <div>
            <p className="text-sm font-medium text-gray-400 mb-1">{DASHBOARD_COPY.kpi.executionLogs}</p>
            <h3 className="text-3xl font-bold text-white">
              {loading ? '-' : (data?.execution_logs_count ?? 0)}
            </h3>
          </div>
          <div className="w-12 h-12 rounded-xl bg-cyan-500/20 flex items-center justify-center border border-cyan-500/30 group-hover:scale-110 transition-transform">
            <ListChecks className="w-6 h-6 text-cyan-400" />
          </div>
        </div>

        <div className="glass-card p-6 flex items-start justify-between group md:col-span-3">
          <div>
            <p className="text-sm font-medium text-gray-400 mb-1">{DASHBOARD_COPY.kpi.activityCount}</p>
            <h3 className="text-3xl font-bold text-white">
              {loading ? '-' : (data?.activity_count ?? 0)}
            </h3>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center border border-emerald-500/30 group-hover:scale-110 transition-transform">
            <Zap className="w-6 h-6 text-emerald-400" />
          </div>
        </div>
      </div>

      {/* Charts Area */}
      <div className="glass-card p-6 min-h-[400px]">
        <h2 className="text-xl font-bold text-white mb-6">{DASHBOARD_COPY.chart.title}</h2>
        {loading ? (
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
