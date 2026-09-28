import { useState } from 'react';
import { useReviewThreatMutation } from '../hooks/useReviewThreatMutation';
import { useTranslation } from '../../../shared/i18n/translations';
import type { Threat, ThreatReviewStatus, ThreatRemediationStatus, ThreatSeverity } from '../types';

interface ThreatReviewPanelProps {
  threat: Threat;
}

const REVIEW_STATUS_OPTIONS: ThreatReviewStatus[] = [
  'pending',
  'reviewing',
  'investigating',
  'confirmed',
  'false_positive',
  'resolved',
];

const REMEDIATION_STATUS_OPTIONS: ThreatRemediationStatus[] = [
  'none',
  'in_progress',
  'completed',
  'not_required',
];

const SEVERITY_OPTIONS: ThreatSeverity[] = [
  'low',
  'medium',
  'high',
  'critical',
];

const THREAT_TYPE_OPTIONS = [
  'critical_security_incident',
  'security_threat',
  'potential_phishing',
  'ransomware',
  'malware',
  'data_breach',
  'phishing',
  'exploit',
  'zero-day',
  'apt',
  'ddos',
  'supply_chain',
  'vulnerability',
  'general',
];

const THREAT_CATEGORY_OPTIONS = [
  'malware',
  'data_breach',
  'phishing',
  'vulnerability',
  'advanced_threat',
  'ddos',
  'supply_chain',
  'critical_incident',
  'security_threat',
  'other',
];

const REVIEW_STATUS_STYLES: Record<ThreatReviewStatus, string> = {
  pending: 'border-yellow-400/30 bg-yellow-500/10 text-yellow-200',
  reviewing: 'border-blue-400/30 bg-blue-500/10 text-blue-200',
  investigating: 'border-indigo-400/30 bg-indigo-500/10 text-indigo-200',
  confirmed: 'border-red-400/30 bg-red-500/10 text-red-200',
  false_positive: 'border-zinc-400/30 bg-zinc-500/10 text-zinc-300',
  resolved: 'border-green-400/30 bg-green-500/10 text-green-200',
};

export function ThreatReviewPanel({ threat }: ThreatReviewPanelProps) {
  const t = useTranslation();
  const mutation = useReviewThreatMutation();
  const classificationLabels = t.threats.classifications;
  const categoryLabels = t.threats.categories;
  const severityLabels = t.threats.severityLabels;

  const [reviewStatus, setReviewStatus] = useState<ThreatReviewStatus>(threat.reviewStatus);
  const [reviewNotes, setReviewNotes] = useState(threat.reviewNotes ?? '');
  const [remediationStatus, setRemediationStatus] = useState<ThreatRemediationStatus>(
    (threat.remediationStatus as ThreatRemediationStatus) ?? 'none',
  );
  const [threatType, setThreatType] = useState(threat.type);
  const [threatCategory, setThreatCategory] = useState(threat.category ?? '');
  const [severity, setSeverity] = useState<ThreatSeverity>(threat.severity);

  const handleSubmit = () => {
    mutation.mutate({
      threatId: threat.id,
      body: {
        review_status: reviewStatus,
        review_notes: reviewNotes.trim() || undefined,
        remediation_status: remediationStatus,
        ...(threatType !== threat.type ? { threat_type: threatType } : {}),
        ...(threatCategory !== (threat.category ?? '') ? { threat_category: threatCategory } : {}),
        ...(severity !== threat.severity ? { criticality_level: severity } : {}),
      },
    });
  };

  const hasChanges =
    reviewStatus !== threat.reviewStatus ||
    (reviewNotes.trim() || '') !== (threat.reviewNotes ?? '') ||
    remediationStatus !== ((threat.remediationStatus as ThreatRemediationStatus) ?? 'none') ||
    threatType !== threat.type ||
    threatCategory !== (threat.category ?? '') ||
    severity !== threat.severity;

  const getLabel = (value: string, labels: Record<string, string>) =>
    labels[value] ?? value.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

  const selectClass =
    'w-full rounded-lg border border-edge-input bg-surface-input px-3 py-2 text-sm text-content-primary focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-400 disabled:opacity-50';

  return (
    <div className="space-y-4 border-t border-edge pt-4 mt-4">
      {/* Classification row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="space-y-1.5">
          <label htmlFor={`threat-type-${threat.id}`} className="block text-xs font-semibold text-content-secondary">
            {t.threats.review.typeLabel}
          </label>
          <select
            id={`threat-type-${threat.id}`}
            value={threatType}
            onChange={(e) => setThreatType(e.target.value)}
            disabled={mutation.isPending}
            className={selectClass}
          >
            {THREAT_TYPE_OPTIONS.map((type) => (
              <option key={type} value={type}>
                {getLabel(type, classificationLabels)}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <label htmlFor={`threat-category-${threat.id}`} className="block text-xs font-semibold text-content-secondary">
            {t.threats.review.categoryLabel}
          </label>
          <select
            id={`threat-category-${threat.id}`}
            value={threatCategory}
            onChange={(e) => setThreatCategory(e.target.value)}
            disabled={mutation.isPending}
            className={selectClass}
          >
            {THREAT_CATEGORY_OPTIONS.map((cat) => (
              <option key={cat} value={cat}>
                {getLabel(cat, categoryLabels)}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <label htmlFor={`severity-${threat.id}`} className="block text-xs font-semibold text-content-secondary">
            {t.threats.review.severityLabel}
          </label>
          <select
            id={`severity-${threat.id}`}
            value={severity}
            onChange={(e) => setSeverity(e.target.value as ThreatSeverity)}
            disabled={mutation.isPending}
            className={selectClass}
          >
            {SEVERITY_OPTIONS.map((sev) => (
              <option key={sev} value={sev}>
                {getLabel(sev, severityLabels)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Review status row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label htmlFor={`review-status-${threat.id}`} className="block text-xs font-semibold text-content-secondary">
            {t.threats.review.statusLabel}
          </label>
          <select
            id={`review-status-${threat.id}`}
            value={reviewStatus}
            onChange={(e) => setReviewStatus(e.target.value as ThreatReviewStatus)}
            disabled={mutation.isPending}
            className={selectClass}
          >
            {REVIEW_STATUS_OPTIONS.map((status) => (
              <option key={status} value={status}>
                {t.analytics.reviewStatus[status]}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <label htmlFor={`remediation-${threat.id}`} className="block text-xs font-semibold text-content-secondary">
            {t.threats.review.remediationLabel}
          </label>
          <select
            id={`remediation-${threat.id}`}
            value={remediationStatus}
            onChange={(e) => setRemediationStatus(e.target.value as ThreatRemediationStatus)}
            disabled={mutation.isPending}
            className={selectClass}
          >
            {REMEDIATION_STATUS_OPTIONS.map((status) => (
              <option key={status} value={status}>
                {t.threats.review.remediationOptions[status]}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Review Notes */}
      <div className="space-y-1.5">
        <label htmlFor={`review-notes-${threat.id}`} className="block text-xs font-semibold text-content-secondary">
          {t.threats.review.notesLabel}
        </label>
        <textarea
          id={`review-notes-${threat.id}`}
          value={reviewNotes}
          onChange={(e) => setReviewNotes(e.target.value)}
          disabled={mutation.isPending}
          rows={3}
          placeholder={t.threats.review.notesPlaceholder}
          className="w-full rounded-lg border border-edge-input bg-surface-input px-3 py-2 text-sm text-content-primary placeholder:text-content-muted focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-400 disabled:opacity-50 resize-y"
        />
      </div>

      {/* Reviewed by info */}
      {threat.reviewedBy && (
        <p className="text-xs text-content-muted">
          {t.threats.review.reviewedBy} {threat.reviewedBy}
          {threat.reviewedAt && (
            <> · {new Date(threat.reviewedAt).toLocaleString()}</>
          )}
        </p>
      )}

      {/* Actions + feedback */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={mutation.isPending || !hasChanges}
          className="inline-flex items-center gap-2 rounded-lg border border-brand-400/30 bg-brand-500/10 px-4 py-2 text-sm font-medium text-brand-400 hover:bg-brand-500/20 disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
        >
          {mutation.isPending ? t.threats.review.saving : t.threats.review.save}
        </button>

        {mutation.isSuccess && (
          <span role="status" className="text-xs text-green-400">
            {t.threats.review.success}
          </span>
        )}

        {mutation.isError && (
          <span role="alert" className="text-xs text-red-400">
            {mutation.error?.message ?? t.threats.review.error}
          </span>
        )}
      </div>

      {/* Current status badge */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-content-muted">{t.threats.review.currentLabel}</span>
        <span className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${REVIEW_STATUS_STYLES[threat.reviewStatus]}`}>
          {t.analytics.reviewStatus[threat.reviewStatus]}
        </span>
      </div>
    </div>
  );
}
