import { useMemo, useState } from 'react';
import { BellRing, CheckCircle2 } from 'lucide-react';
import { useTranslation } from '../../../shared/i18n/translations';
import { useDateFormat } from '../../../shared/contexts/DateFormatContext';
import { useAuth } from '../../auth';
import { AcknowledgeAlertError } from '../api';
import { ALERT_DELIVERY_STATUSES, ALERTS_DEFAULT_LIMIT } from '../contract';
import { useAcknowledgeAlertMutation } from '../hooks/useAcknowledgeAlertMutation';
import { useAlertsQuery } from '../hooks/useAlertsQuery';
import type { AlertDeliveryStatus, AlertResponse } from '../types';

type AcknowledgedFilter = 'all' | 'true' | 'false';

const severityStyles: Record<string, string> = {
  info: 'border-sky-500/30 bg-sky-500/10 text-sky-300',
  warning: 'border-amber-500/30 bg-amber-500/10 text-amber-300',
  high: 'border-orange-500/30 bg-orange-500/10 text-orange-300',
  critical: 'border-red-500/30 bg-red-500/10 text-red-300',
};

const formatChannels = (alert: AlertResponse) => {
  const channels = alert.channels_sent?.filter(Boolean) ?? [];
  if (alert.slack_channel) channels.push(alert.slack_channel);
  return channels.length > 0 ? Array.from(new Set(channels)).join(', ') : '—';
};

export function AlertsPage() {
  const t = useTranslation();
  const { formatDateTime } = useDateFormat();
  const { hasPermission } = useAuth();
  const canWrite = hasPermission('alerts', 'write');
  const [deliveryStatus, setDeliveryStatus] = useState<AlertDeliveryStatus | 'all'>('all');
  const [acknowledgedFilter, setAcknowledgedFilter] = useState<AcknowledgedFilter>('all');
  const [offset, setOffset] = useState(0);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const query = useMemo(() => ({
    limit: ALERTS_DEFAULT_LIMIT,
    offset,
    ...(deliveryStatus !== 'all' ? { delivery_status: deliveryStatus } : {}),
    ...(acknowledgedFilter !== 'all' ? { acknowledged: acknowledgedFilter === 'true' } : {}),
  }), [acknowledgedFilter, deliveryStatus, offset]);

  const { data: alerts = [], isLoading, error: listError, isFetching } = useAlertsQuery(query);
  const acknowledgeMutation = useAcknowledgeAlertMutation();
  const hasNext = alerts.length === ALERTS_DEFAULT_LIMIT;
  const hasPrevious = offset > 0;
  const displayFrom = alerts.length > 0 ? offset + 1 : 0;
  const displayTo = offset + alerts.length;

  const listErrorMessage = listError ? (listError instanceof Error ? listError.message : t.alerts.errors.listFallback) : null;

  const resetPaging = () => {
    setOffset(0);
    setStatusMessage(null);
    setActionError(null);
  };

  const handleAcknowledge = async (alert: AlertResponse) => {
    setStatusMessage(null);
    setActionError(null);
    try {
      const acknowledged = await acknowledgeMutation.mutateAsync(alert.alert_id);
      setStatusMessage(t.alerts.status.acknowledged(acknowledged.alert_title));
    } catch (caughtError) {
      setActionError(caughtError instanceof AcknowledgeAlertError ? caughtError.message : t.alerts.errors.acknowledgeFallback);
    }
  };

  return (
    <section className="space-y-6" aria-labelledby="alerts-page-title">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-brand-400">{t.alerts.eyebrow}</p>
        <h1 id="alerts-page-title" className="mt-2 text-3xl font-bold text-content-heading">{t.alerts.title}</h1>
        <p className="mt-2 max-w-3xl text-content-secondary">{t.alerts.description}</p>
      </div>

      {!canWrite && (
        <div className="glass-card border-amber-500/20 bg-amber-500/5 p-4 text-sm text-amber-600 dark:text-amber-100" role="note">
          {t.alerts.authNotice.readOnly}
        </div>
      )}

      {statusMessage && (
        <div className="glass-card border-emerald-500/20 bg-emerald-500/5 p-4 text-sm text-emerald-400" role="status">
          {statusMessage}
        </div>
      )}
      {actionError && (
        <div className="glass-card border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300" role="alert">
          {actionError}
        </div>
      )}

      <section className="glass-card p-6">
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-500/10">
              <BellRing aria-hidden="true" className="h-5 w-5 text-brand-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-content-heading">{t.alerts.list.title}</h2>
              <p className="text-sm text-content-secondary">{t.alerts.list.description}</p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm font-medium text-content-secondary" htmlFor="delivery-status-filter">
              {t.alerts.filters.deliveryStatus}
              <select
                id="delivery-status-filter"
                className="mt-1.5 w-full rounded-xl border border-edge-input bg-surface-input px-3 py-2 text-content-primary outline-none transition focus:border-brand-500"
                value={deliveryStatus}
                onChange={(event) => { setDeliveryStatus(event.target.value as AlertDeliveryStatus | 'all'); resetPaging(); }}
              >
                <option value="all">{t.alerts.filters.allStatuses}</option>
                {ALERT_DELIVERY_STATUSES.map((status) => <option key={status} value={status}>{t.alerts.deliveryStatus[status]}</option>)}
              </select>
            </label>
            <label className="text-sm font-medium text-content-secondary" htmlFor="acknowledged-filter">
              {t.alerts.filters.acknowledged}
              <select
                id="acknowledged-filter"
                className="mt-1.5 w-full rounded-xl border border-edge-input bg-surface-input px-3 py-2 text-content-primary outline-none transition focus:border-brand-500"
                value={acknowledgedFilter}
                onChange={(event) => { setAcknowledgedFilter(event.target.value as AcknowledgedFilter); resetPaging(); }}
              >
                <option value="all">{t.alerts.filters.allAcknowledgement}</option>
                <option value="false">{t.alerts.acknowledgement.unacknowledged}</option>
                <option value="true">{t.alerts.acknowledgement.acknowledged}</option>
              </select>
            </label>
          </div>
        </div>

        {isLoading && <p className="mt-6 text-sm text-content-muted animate-pulse">{t.alerts.loading}</p>}

        {listErrorMessage && (
          <div className="mt-6 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300" role="alert">
            {listErrorMessage}
          </div>
        )}

        {!isLoading && !listErrorMessage && alerts.length === 0 && (
          <div className="mt-6 rounded-xl border border-edge-card bg-surface-secondary p-6 text-content-secondary">
            <h3 className="font-semibold text-content-heading">{t.alerts.empty.title}</h3>
            <p className="mt-1 text-sm">{t.alerts.empty.description}</p>
          </div>
        )}

        {alerts.length > 0 && (
          <div className="mt-6 overflow-x-auto">
            <table className="min-w-full text-sm" aria-label={t.alerts.list.ariaLabel}>
              <thead>
                <tr className="border-b border-edge text-left text-content-muted">
                  <th className="py-3 pr-4 font-medium">{t.alerts.list.columns.alert}</th>
                  <th className="px-4 py-3 font-medium">{t.alerts.list.columns.delivery}</th>
                  <th className="px-4 py-3 font-medium">{t.alerts.list.columns.channels}</th>
                  <th className="px-4 py-3 font-medium">{t.alerts.list.columns.acknowledged}</th>
                  <th className="px-4 py-3 font-medium">{t.alerts.list.columns.timestamps}</th>
                  {canWrite && <th className="pl-4 py-3 font-medium">{t.alerts.list.columns.actions}</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-edge-card">
                {alerts.map((alert) => {
                  const isBusy = acknowledgeMutation.isPending;
                  return (
                    <tr key={alert.alert_id} className="align-top transition-colors hover:bg-surface-hover">
                      <td className="py-4 pr-4">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-semibold text-content-heading">{alert.alert_title}</span>
                          <span className={`rounded-full border px-2 py-0.5 text-xs font-semibold uppercase ${severityStyles[alert.alert_severity] ?? severityStyles.info}`}>
                            {t.alerts.severity[alert.alert_severity]}
                          </span>
                        </div>
                        <p className="mt-2 max-w-xl text-content-secondary">{alert.alert_message}</p>
                        <p className="mt-2 text-xs text-content-muted">{t.alerts.list.detectionId}: {alert.detection_id}</p>
                      </td>
                      <td className="px-4 py-4 text-content-secondary">{t.alerts.deliveryStatus[alert.delivery_status]}</td>
                      <td className="px-4 py-4 text-content-secondary">{formatChannels(alert)}</td>
                      <td className="px-4 py-4">
                        <span className={alert.acknowledged ? 'text-emerald-400' : 'text-amber-300'}>
                          {alert.acknowledged ? t.alerts.acknowledgement.acknowledged : t.alerts.acknowledgement.unacknowledged}
                        </span>
                        {alert.acknowledged_by && <p className="mt-1 text-xs text-content-muted">{alert.acknowledged_by}</p>}
                      </td>
                      <td className="px-4 py-4 text-xs text-content-secondary">
                        <p>{t.alerts.timestamps.created}: {formatDateTime(alert.created_at)}</p>
                        <p>{t.alerts.timestamps.sent}: {formatDateTime(alert.sent_at)}</p>
                        <p>{t.alerts.timestamps.acknowledged}: {formatDateTime(alert.acknowledged_at)}</p>
                      </td>
                      {canWrite && (
                        <td className="pl-4 py-4">
                          {!alert.acknowledged && (
                            <button
                              type="button"
                              onClick={() => handleAcknowledge(alert)}
                              disabled={isBusy}
                              className="inline-flex items-center gap-2 rounded-lg border border-emerald-500/30 px-3 py-1.5 text-xs font-medium text-emerald-300 transition hover:bg-emerald-500/10 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              <CheckCircle2 aria-hidden="true" className="h-3.5 w-3.5" />
                              {isBusy ? t.alerts.actions.acknowledging : t.alerts.actions.acknowledge}
                            </button>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-edge-card pt-4 text-sm text-content-secondary">
          <span>{t.alerts.pagination.window(displayFrom, displayTo)}{isFetching && !isLoading ? ` · ${t.alerts.pagination.refreshing}` : ''}</span>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={!hasPrevious || isFetching}
              onClick={() => { setOffset(Math.max(0, offset - ALERTS_DEFAULT_LIMIT)); setStatusMessage(null); setActionError(null); }}
              className="rounded-xl border border-edge px-4 py-2 font-medium text-content-secondary transition hover:bg-surface-hover disabled:cursor-not-allowed disabled:opacity-50"
            >
              {t.alerts.pagination.previous}
            </button>
            <button
              type="button"
              disabled={!hasNext || isFetching}
              onClick={() => { setOffset(offset + ALERTS_DEFAULT_LIMIT); setStatusMessage(null); setActionError(null); }}
              className="rounded-xl border border-edge px-4 py-2 font-medium text-content-secondary transition hover:bg-surface-hover disabled:cursor-not-allowed disabled:opacity-50"
            >
              {t.alerts.pagination.next}
            </button>
          </div>
        </div>
      </section>
    </section>
  );
}
