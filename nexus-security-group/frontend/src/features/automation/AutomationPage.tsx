import { Activity, AlertTriangle, CheckCircle, Clock, FileText, Loader2, XCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { AutomationTriggers } from './AutomationTriggers';
import { useExecutionLogsQuery } from '../logs/hooks/useExecutionLogsQuery';
import { useTranslation } from '../../shared/i18n/translations';
import { useDateFormat } from '../../shared/contexts/DateFormatContext';
import type { ExecutionLogResponse } from '../logs/types';

const STATUS_STYLES: Record<string, { icon: typeof CheckCircle; color: string; bg: string; border: string }> = {
  success: { icon: CheckCircle, color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
  partial_success: { icon: AlertTriangle, color: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/20' },
  error: { icon: XCircle, color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20' },
  warning: { icon: AlertTriangle, color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20' },
  timeout: { icon: Clock, color: 'text-zinc-400', bg: 'bg-zinc-500/10', border: 'border-zinc-500/20' },
};

const getStatusStyle = (status: string) =>
  STATUS_STYLES[status] ?? STATUS_STYLES.error;

function StatusBadge({ status, label }: { status: string; label: string }) {
  const style = getStatusStyle(status);
  const Icon = style.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium ${style.color} ${style.bg} ${style.border}`}>
      <Icon className="h-3.5 w-3.5" />
      {label}
    </span>
  );
}

function StatCard({ label, value, accent }: { label: string; value: string | number; accent?: string }) {
  return (
    <div className="rounded-xl border border-edge-card bg-surface-secondary p-4 text-center">
      <p className={`text-2xl font-bold ${accent ?? 'text-content-heading'}`}>{value}</p>
      <p className="mt-1 text-xs text-content-muted">{label}</p>
    </div>
  );
}

function formatDuration(seconds: number | null, t: ReturnType<typeof useTranslation>): string {
  if (seconds === null || seconds === undefined) return t.automation.status.durationNA;
  return t.automation.status.durationSeconds(seconds);
}

export function AutomationPage() {
  const t = useTranslation();
  const { formatDate } = useDateFormat();
  const { data: logs = [], isLoading } = useExecutionLogsQuery({ limit: 10 });

  const lastExecution: ExecutionLogResponse | undefined = logs[0];

  return (
    <section className="space-y-6" aria-labelledby="automation-page-title">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-brand-400">
          {t.automation.eyebrow}
        </p>
        <h1 id="automation-page-title" className="mt-2 text-3xl font-bold text-content-heading">
          {t.automation.title}
        </h1>
        <p className="mt-2 max-w-3xl text-content-secondary">
          {t.automation.pageDescription}
        </p>
      </div>

      {/* Pipeline Status Card */}
      <div className="glass-card p-6 space-y-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-500/10">
            <Activity aria-hidden="true" className="h-5 w-5 text-brand-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-content-heading">{t.automation.status.title}</h2>
            <p className="text-sm text-content-secondary">{t.automation.status.lastExecution}</p>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-brand-400" />
          </div>
        ) : !lastExecution ? (
          <p className="text-sm text-content-muted py-4">{t.automation.status.noExecutions}</p>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-4">
              <StatusBadge
                status={lastExecution.status}
                label={t.automation.status.statusLabels[lastExecution.status] ?? lastExecution.status}
              />
              <span className="text-sm text-content-secondary">
                {lastExecution.started_at ? formatDate(lastExecution.started_at) : '—'}
              </span>
              <span className="text-sm text-content-muted">
                {t.automation.status.duration}: {formatDuration(lastExecution.duration_seconds, t)}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <StatCard
                label={t.automation.status.mentionsCollected}
                value={lastExecution.mentions_collected}
                accent="text-sky-400"
              />
              <StatCard
                label={t.automation.status.mentionsProcessed}
                value={lastExecution.mentions_processed}
                accent="text-cyan-400"
              />
              <StatCard
                label={t.automation.status.detectionsGenerated}
                value={lastExecution.detections_generated}
                accent="text-amber-400"
              />
              <StatCard
                label={t.automation.status.alertsGenerated}
                value={lastExecution.alerts_generated}
                accent="text-red-400"
              />
            </div>

            <div className="flex items-center gap-2 text-sm text-content-muted">
              <Clock className="h-4 w-4" />
              <span>{t.automation.status.nextExecution}: {t.automation.status.estimatedNext}</span>
            </div>
          </>
        )}
      </div>

      {/* Manual Trigger */}
      <AutomationTriggers />

      {/* Execution History */}
      <div className="glass-card overflow-hidden">
        <div className="p-6 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/10">
              <FileText aria-hidden="true" className="h-5 w-5 text-cyan-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-content-heading">{t.automation.history.title}</h2>
              <p className="text-sm text-content-secondary">{t.automation.history.description}</p>
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-brand-400" />
          </div>
        ) : logs.length === 0 ? (
          <p className="px-6 pb-6 text-sm text-content-muted">{t.automation.history.empty}</p>
        ) : (
          <>
            <div className="overflow-x-auto px-6 pb-4">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-edge text-left text-content-muted">
                    <th className="py-3 pr-4 font-medium">{t.automation.history.columns.date}</th>
                    <th className="px-4 py-3 font-medium">{t.automation.history.columns.status}</th>
                    <th className="px-4 py-3 font-medium">{t.automation.history.columns.duration}</th>
                    <th className="px-4 py-3 font-medium">{t.automation.history.columns.mentions}</th>
                    <th className="px-4 py-3 font-medium">{t.automation.history.columns.detections}</th>
                    <th className="pl-4 py-3 font-medium">{t.automation.history.columns.alerts}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-edge-card">
                  {logs.map((log) => (
                    <tr key={log.log_id} className="transition-colors hover:bg-surface-hover">
                      <td className="py-3 pr-4 text-content-secondary">
                        {log.started_at ? formatDate(log.started_at) : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge
                          status={log.status}
                          label={t.automation.status.statusLabels[log.status] ?? log.status}
                        />
                      </td>
                      <td className="px-4 py-3 text-content-muted">
                        {formatDuration(log.duration_seconds, t)}
                      </td>
                      <td className="px-4 py-3 text-content-secondary">{log.mentions_collected}</td>
                      <td className="px-4 py-3 text-content-secondary">{log.detections_generated}</td>
                      <td className="pl-4 py-3 text-content-secondary">{log.alerts_generated}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="border-t border-edge px-6 py-3">
              <Link
                to="/logs"
                className="text-sm font-medium text-brand-400 hover:underline"
              >
                {t.automation.history.showMore} →
              </Link>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
