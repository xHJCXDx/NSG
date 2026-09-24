import { useMemo, useState } from 'react';
import { ClipboardList, History } from 'lucide-react';
import { useTranslation } from '../../../shared/i18n/translations';
import { useDateFormat } from '../../../shared/contexts/DateFormatContext';
import { EXECUTION_LOG_STATUSES, LOGS_DEFAULT_LIMIT, USER_ACTIVITY_DEFAULT_LIMIT } from '../contract';
import { useExecutionLogsQuery } from '../hooks/useExecutionLogsQuery';
import { useUserActivityQuery } from '../hooks/useUserActivityQuery';
import type { ExecutionLogStatus } from '../types';

type ActiveTab = 'executions' | 'activity';

const formatDuration = (value?: number | null) => (typeof value === 'number' ? `${value}s` : '—');
const formatRelatedId = (label: string, value?: number | null) => (value ? `${label} #${value}` : null);

const statusStyles: Record<ExecutionLogStatus, string> = {
  success: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
  partial_success: 'border-sky-500/30 bg-sky-500/10 text-sky-300',
  error: 'border-red-500/30 bg-red-500/10 text-red-300',
  warning: 'border-amber-500/30 bg-amber-500/10 text-amber-300',
  timeout: 'border-purple-500/30 bg-purple-500/10 text-purple-300',
};

export function LogsPage() {
  const t = useTranslation();
  const { formatDateTime } = useDateFormat();
  const [activeTab, setActiveTab] = useState<ActiveTab>('executions');
  const [status, setStatus] = useState<ExecutionLogStatus | 'all'>('all');
  const [workflowName, setWorkflowName] = useState('');
  const [executionOffset, setExecutionOffset] = useState(0);
  const [username, setUsername] = useState('');
  const [activityType, setActivityType] = useState('');
  const [activityLimit, setActivityLimit] = useState(USER_ACTIVITY_DEFAULT_LIMIT);

  const executionQuery = useMemo(() => ({
    limit: LOGS_DEFAULT_LIMIT,
    offset: executionOffset,
    ...(status !== 'all' ? { status } : {}),
    ...(workflowName.trim() ? { workflow_name: workflowName.trim() } : {}),
  }), [executionOffset, status, workflowName]);

  const activityQuery = useMemo(() => ({
    limit: activityLimit,
    ...(username.trim() ? { username: username.trim() } : {}),
    ...(activityType.trim() ? { activity_type: activityType.trim() } : {}),
  }), [activityLimit, activityType, username]);

  const { data: executionLogs = [], isLoading: executionsLoading, error: executionsError, isFetching: executionsFetching } = useExecutionLogsQuery(executionQuery);
  const { data: activities = [], isLoading: activityLoading, error: activityError, isFetching: activityFetching } = useUserActivityQuery(activityQuery);

  const executionsErrorMessage = executionsError ? (executionsError instanceof Error ? executionsError.message : t.logs.executions.errors.fallback) : null;
  const activityErrorMessage = activityError ? (activityError instanceof Error ? activityError.message : t.logs.activity.errors.fallback) : null;
  const hasPrevious = executionOffset > 0;
  const hasNext = executionLogs.length === LOGS_DEFAULT_LIMIT;

  const resetExecutionPaging = () => setExecutionOffset(0);

  return (
    <section className="space-y-6" aria-labelledby="logs-page-title">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-brand-400">{t.logs.eyebrow}</p>
        <h1 id="logs-page-title" className="mt-2 text-3xl font-bold text-content-heading">{t.logs.title}</h1>
        <p className="mt-2 max-w-3xl text-content-secondary">{t.logs.description}</p>
      </div>

      <div className="glass-card p-2" role="tablist" aria-label={t.logs.tabs.ariaLabel}>
        <button type="button" role="tab" aria-selected={activeTab === 'executions'} onClick={() => setActiveTab('executions')} className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${activeTab === 'executions' ? 'bg-brand-500/10 text-brand-400' : 'text-content-muted hover:bg-surface-hover'}`}>
          {t.logs.tabs.executions}
        </button>
        <button type="button" role="tab" aria-selected={activeTab === 'activity'} onClick={() => setActiveTab('activity')} className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${activeTab === 'activity' ? 'bg-brand-500/10 text-brand-400' : 'text-content-muted hover:bg-surface-hover'}`}>
          {t.logs.tabs.activity}
        </button>
      </div>

      {activeTab === 'executions' && (
        <section className="glass-card p-6" aria-labelledby="execution-logs-title">
          <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-500/10"><ClipboardList aria-hidden="true" className="h-5 w-5 text-brand-400" /></div>
              <div>
                <h2 id="execution-logs-title" className="text-xl font-bold text-content-heading">{t.logs.executions.title}</h2>
                <p className="text-sm text-content-secondary">{t.logs.executions.description}</p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-sm font-medium text-content-secondary" htmlFor="execution-status-filter">
                {t.logs.executions.filters.status}
                <select id="execution-status-filter" className="mt-1.5 w-full rounded-xl border border-edge-input bg-surface-input px-3 py-2 text-content-primary outline-none transition focus:border-brand-500" value={status} onChange={(event) => { setStatus(event.target.value as ExecutionLogStatus | 'all'); resetExecutionPaging(); }}>
                  <option value="all">{t.logs.executions.filters.allStatuses}</option>
                  {EXECUTION_LOG_STATUSES.map((item) => <option key={item} value={item}>{t.logs.executions.status[item]}</option>)}
                </select>
              </label>
              <label className="text-sm font-medium text-content-secondary" htmlFor="workflow-name-filter">
                {t.logs.executions.filters.workflowName}
                <input id="workflow-name-filter" className="mt-1.5 w-full rounded-xl border border-edge-input bg-surface-input px-3 py-2 text-content-primary outline-none transition focus:border-brand-500" value={workflowName} onChange={(event) => { setWorkflowName(event.target.value); resetExecutionPaging(); }} placeholder={t.logs.executions.filters.workflowPlaceholder} />
              </label>
            </div>
          </div>

          {executionsLoading && <p className="mt-6 animate-pulse text-sm text-content-muted">{t.logs.executions.loading}</p>}
          {executionsErrorMessage && <div className="mt-6 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300" role="alert">{executionsErrorMessage}</div>}
          {!executionsLoading && !executionsErrorMessage && executionLogs.length === 0 && <div className="mt-6 rounded-xl border border-edge-card bg-surface-secondary p-6 text-content-secondary"><h3 className="font-semibold text-content-heading">{t.logs.executions.empty.title}</h3><p className="mt-1 text-sm">{t.logs.executions.empty.description}</p></div>}

          {executionLogs.length > 0 && (
            <div className="mt-6 overflow-x-auto">
              <table className="min-w-full text-sm" aria-label={t.logs.executions.table.ariaLabel}>
                <thead><tr className="border-b border-edge text-left text-content-muted"><th className="py-3 pr-4 font-medium">{t.logs.executions.table.columns.workflow}</th><th className="px-4 py-3 font-medium">{t.logs.executions.table.columns.status}</th><th className="px-4 py-3 font-medium">{t.logs.executions.table.columns.counters}</th><th className="px-4 py-3 font-medium">{t.logs.executions.table.columns.timestamps}</th><th className="px-4 py-3 font-medium">{t.logs.executions.table.columns.duration}</th></tr></thead>
                <tbody className="divide-y divide-edge-card">
                  {executionLogs.map((log) => (
                    <tr key={log.log_id} className="align-top transition-colors hover:bg-surface-hover">
                      <td className="py-4 pr-4"><p className="font-semibold text-content-heading">{log.workflow_name}</p><p className="mt-1 text-xs text-content-muted">{log.execution_uuid}</p></td>
                      <td className="px-4 py-4"><span className={`rounded-full border px-2 py-0.5 text-xs font-semibold uppercase ${statusStyles[log.status]}`}>{t.logs.executions.status[log.status]}</span></td>
                      <td className="px-4 py-4 text-content-secondary"><p>{t.logs.executions.counters.mentionsCollected}: {log.mentions_collected}</p><p>{t.logs.executions.counters.mentionsProcessed}: {log.mentions_processed}</p><p>{t.logs.executions.counters.detections}: {log.detections_generated}</p><p>{t.logs.executions.counters.alerts}: {log.alerts_generated}</p></td>
                      <td className="px-4 py-4 text-xs text-content-secondary"><p>{t.logs.executions.timestamps.started}: {formatDateTime(log.started_at)}</p><p>{t.logs.executions.timestamps.completed}: {formatDateTime(log.completed_at)}</p></td>
                      <td className="px-4 py-4 text-content-secondary">{formatDuration(log.duration_seconds)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-edge-card pt-4 text-sm text-content-secondary">
            <span>{t.logs.executions.pagination.window(executionLogs.length > 0 ? executionOffset + 1 : 0, executionOffset + executionLogs.length)}{executionsFetching && !executionsLoading ? ` · ${t.logs.executions.pagination.refreshing}` : ''}</span>
            <div className="flex gap-2">
              <button type="button" disabled={!hasPrevious || executionsFetching} onClick={() => setExecutionOffset(Math.max(0, executionOffset - LOGS_DEFAULT_LIMIT))} className="rounded-xl border border-edge px-4 py-2 font-medium text-content-secondary transition hover:bg-surface-hover disabled:cursor-not-allowed disabled:opacity-50">{t.logs.executions.pagination.previous}</button>
              <button type="button" disabled={!hasNext || executionsFetching} onClick={() => setExecutionOffset(executionOffset + LOGS_DEFAULT_LIMIT)} className="rounded-xl border border-edge px-4 py-2 font-medium text-content-secondary transition hover:bg-surface-hover disabled:cursor-not-allowed disabled:opacity-50">{t.logs.executions.pagination.next}</button>
            </div>
          </div>
        </section>
      )}

      {activeTab === 'activity' && (
        <section className="glass-card p-6" aria-labelledby="user-activity-title">
          <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
            <div className="flex items-start gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-500/10"><History aria-hidden="true" className="h-5 w-5 text-brand-400" /></div><div><h2 id="user-activity-title" className="text-xl font-bold text-content-heading">{t.logs.activity.title}</h2><p className="text-sm text-content-secondary">{t.logs.activity.description}</p></div></div>
            <div className="grid gap-3 md:grid-cols-3">
              <label className="text-sm font-medium text-content-secondary" htmlFor="activity-username-filter">{t.logs.activity.filters.username}<input id="activity-username-filter" className="mt-1.5 w-full rounded-xl border border-edge-input bg-surface-input px-3 py-2 text-content-primary outline-none transition focus:border-brand-500" value={username} onChange={(event) => setUsername(event.target.value)} placeholder={t.logs.activity.filters.usernamePlaceholder} /></label>
              <label className="text-sm font-medium text-content-secondary" htmlFor="activity-type-filter">{t.logs.activity.filters.activityType}<input id="activity-type-filter" className="mt-1.5 w-full rounded-xl border border-edge-input bg-surface-input px-3 py-2 text-content-primary outline-none transition focus:border-brand-500" value={activityType} onChange={(event) => setActivityType(event.target.value)} placeholder={t.logs.activity.filters.typePlaceholder} /></label>
              <label className="text-sm font-medium text-content-secondary" htmlFor="activity-limit-filter">{t.logs.activity.filters.limit}<select id="activity-limit-filter" className="mt-1.5 w-full rounded-xl border border-edge-input bg-surface-input px-3 py-2 text-content-primary outline-none transition focus:border-brand-500" value={activityLimit} onChange={(event) => setActivityLimit(Number(event.target.value))}><option value={10}>10</option><option value={25}>25</option><option value={50}>50</option><option value={100}>100</option></select></label>
            </div>
          </div>

          {activityLoading && <p className="mt-6 animate-pulse text-sm text-content-muted">{t.logs.activity.loading}</p>}
          {activityErrorMessage && <div className="mt-6 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300" role="alert">{activityErrorMessage}</div>}
          {!activityLoading && !activityErrorMessage && activities.length === 0 && <div className="mt-6 rounded-xl border border-edge-card bg-surface-secondary p-6 text-content-secondary"><h3 className="font-semibold text-content-heading">{t.logs.activity.empty.title}</h3><p className="mt-1 text-sm">{t.logs.activity.empty.description}</p></div>}

          {activities.length > 0 && (
            <div className="mt-6 overflow-x-auto">
              <table className="min-w-full text-sm" aria-label={t.logs.activity.table.ariaLabel}>
                <thead><tr className="border-b border-edge text-left text-content-muted"><th className="py-3 pr-4 font-medium">{t.logs.activity.table.columns.user}</th><th className="px-4 py-3 font-medium">{t.logs.activity.table.columns.type}</th><th className="px-4 py-3 font-medium">{t.logs.activity.table.columns.description}</th><th className="px-4 py-3 font-medium">{t.logs.activity.table.columns.related}</th><th className="px-4 py-3 font-medium">{t.logs.activity.table.columns.timestamp}</th></tr></thead>
                <tbody className="divide-y divide-edge-card">
                  {activities.map((activity) => {
                    const related = [formatRelatedId(t.logs.activity.related.mention, activity.related_mention_id), formatRelatedId(t.logs.activity.related.detection, activity.related_detection_id), formatRelatedId(t.logs.activity.related.alert, activity.related_alert_id)].filter(Boolean);
                    return <tr key={activity.activity_id} className="align-top transition-colors hover:bg-surface-hover"><td className="py-4 pr-4"><p className="font-semibold text-content-heading">{activity.username}</p><p className="mt-1 text-xs text-content-muted">{activity.user_role}</p></td><td className="px-4 py-4 text-content-secondary">{activity.activity_type}</td><td className="px-4 py-4 text-content-secondary">{activity.activity_description}</td><td className="px-4 py-4 text-content-secondary">{related.length > 0 ? related.join(' · ') : '—'}</td><td className="px-4 py-4 text-content-secondary">{formatDateTime(activity.activity_timestamp)}</td></tr>;
                  })}
                </tbody>
              </table>
            </div>
          )}

          <div className="mt-6 border-t border-edge-card pt-4 text-sm text-content-secondary">
            {t.logs.activity.resultCount(activities.length)}{activityFetching && !activityLoading ? ` · ${t.logs.activity.refreshing}` : ''}
          </div>
        </section>
      )}
    </section>
  );
}
