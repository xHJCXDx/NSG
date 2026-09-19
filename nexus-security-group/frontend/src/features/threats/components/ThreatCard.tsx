import { useState } from 'react';
import type { Threat, ThreatSeverity } from '../types';
import { useTranslation } from '../../../shared/i18n/translations';

interface ThreatCardProps {
  threat: Threat;
}

const SEVERITY_STYLES: Record<string, { badge: string; border: string }> = {
  low: {
    badge: 'border-green-400/30 bg-green-500/10 text-green-200',
    border: 'border-l-green-500',
  },
  medium: {
    badge: 'border-yellow-400/30 bg-yellow-500/10 text-yellow-200',
    border: 'border-l-yellow-500',
  },
  high: {
    badge: 'border-orange-400/30 bg-orange-500/10 text-orange-200',
    border: 'border-l-orange-500',
  },
  critical: {
    badge: 'border-red-400/30 bg-red-500/10 text-red-200',
    border: 'border-l-red-500',
  },
};

const EVIDENCE_VISIBLE_LIMIT = 5;

const getSeverityStyles = (severity: ThreatSeverity) =>
  SEVERITY_STYLES[severity?.toLowerCase()] ?? {
    badge: 'border-edge bg-surface-hover text-content-secondary',
    border: 'border-l-edge',
  };

const timeAgo = (value: string, unknownDateLabel: string): string => {
  if (!value) return unknownDateLabel;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} day${days !== 1 ? 's' : ''} ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} month${months !== 1 ? 's' : ''} ago`;
  const years = Math.floor(months / 12);
  return `${years} year${years !== 1 ? 's' : ''} ago`;
};

const formatPercent = (value: number) => `${Math.round(value * 100)}%`;

const stripMarkdown = (text: string): string =>
  text
    .replace(/#{1,6}\s+/g, '')
    .replace(/\*{1,3}([^*]+)\*{1,3}/g, '$1')
    .replace(/`{1,3}[^`]*`{1,3}/g, '')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/^[-*+]\s+/gm, '')
    .replace(/^\d+\.\s+/gm, '')
    .replace(/^>\s+/gm, '')
    .replace(/\|/g, ' ')
    .replace(/---+/g, '')
    .replace(/\n{2,}/g, ' ')
    .replace(/\n/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();

const SUMMARY_TRUNCATE_LENGTH = 200;

const RELATED_MENTION_TRUNCATE_LENGTH = 80;

export function ThreatCard({ threat }: ThreatCardProps) {
  const t = useTranslation();
  const [summaryExpanded, setSummaryExpanded] = useState(false);
  const [evidenceExpanded, setEvidenceExpanded] = useState(false);
  const [relatedMentionExpanded, setRelatedMentionExpanded] = useState(false);

  const { badge, border } = getSeverityStyles(threat.severity);
  const evidence = threat.evidence ?? [];
  const visibleEvidence = evidenceExpanded ? evidence : evidence.slice(0, EVIDENCE_VISIBLE_LIMIT);
  const hasMoreEvidence = evidence.length > EVIDENCE_VISIBLE_LIMIT;

  const summary = stripMarkdown(threat.summary ?? '');
  const summaryTruncated = summary.length > SUMMARY_TRUNCATE_LENGTH && !summaryExpanded;
  const summaryText = summaryTruncated ? `${summary.slice(0, SUMMARY_TRUNCATE_LENGTH)}…` : summary;

  return (
    <article className={`glass-card p-5 space-y-4 border-l-4 ${border}`}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-wide text-brand-400 font-semibold">{threat.type}</p>
          <h2 className="mt-1 text-xl font-bold text-content-heading">{threat.category ?? t.threats.card.fallbackCategory}</h2>
          <p className="text-xs text-content-muted">{t.threats.card.detectedLabel}: {timeAgo(threat.detectedAt, t.threats.card.unknownDate)}</p>
        </div>
        <div className="flex flex-wrap gap-2 justify-end">
          <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${badge}`}>
            {threat.severity}
          </span>
          <span className="rounded-full border border-edge px-3 py-1 text-xs text-content-secondary">
            {t.threats.card.confidenceLabel} {formatPercent(threat.confidence)}
          </span>
          {threat.riskScore !== null && threat.riskScore !== undefined && (
            <span className="rounded-full border border-edge px-3 py-1 text-xs text-content-secondary">
              {t.threats.card.riskLabel} {threat.riskScore}
            </span>
          )}
        </div>
      </div>

      {summary && (
        <p className="text-content-primary leading-relaxed">
          {summaryText}
          {summary.length > SUMMARY_TRUNCATE_LENGTH && (
            <button
              type="button"
              onClick={() => setSummaryExpanded((prev) => !prev)}
              className="ml-2 text-brand-400 text-xs hover:underline"
            >
              {summaryExpanded ? t.threats.card.showLess : t.threats.card.showMore}
            </button>
          )}
        </p>
      )}

      {evidence.length > 0 && (
        <div>
          <p className="text-sm font-semibold text-content-secondary">{t.threats.card.evidenceLabel}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {visibleEvidence.map((item, index) => (
              <span
                key={index}
                className="rounded-md border border-edge bg-surface-hover px-2 py-1 text-xs text-content-secondary max-w-xs truncate"
              >
                {item}
              </span>
            ))}
            {hasMoreEvidence && (
              <button
                type="button"
                onClick={() => setEvidenceExpanded((prev) => !prev)}
                className="rounded-md border border-brand-400/30 bg-brand-500/10 px-2 py-1 text-xs text-brand-300 hover:bg-brand-500/20"
              >
                {evidenceExpanded ? t.threats.card.showLess : `+${evidence.length - EVIDENCE_VISIBLE_LIMIT} more`}
              </button>
            )}
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3 text-sm text-content-secondary">
        {threat.source && <span>{t.threats.card.sourceLabel}: {threat.source}</span>}
        {threat.relatedMention ? (
          <span>
            {t.threats.card.relatedMentionLabel}: {(() => {
              const raw = threat.relatedMention.text ?? threat.relatedMention.id;
              const clean = stripMarkdown(String(raw));
              const shouldTruncate = clean.length > RELATED_MENTION_TRUNCATE_LENGTH;
              const displayText = shouldTruncate && !relatedMentionExpanded
                ? `${clean.slice(0, RELATED_MENTION_TRUNCATE_LENGTH)}…`
                : clean;
              return (
                <>
                  {displayText}
                  {shouldTruncate && (
                    <button
                      type="button"
                      onClick={() => setRelatedMentionExpanded((prev) => !prev)}
                      className="ml-2 text-brand-400 text-xs hover:underline"
                    >
                      {relatedMentionExpanded ? t.threats.card.showLess : t.threats.card.showMore}
                    </button>
                  )}
                </>
              );
            })()}
            {threat.relatedMention.platform ? ` (${threat.relatedMention.platform})` : ''}
          </span>
        ) : threat.mentionId ? (
          <span>{t.threats.card.relatedMentionIdLabel}: {threat.mentionId}</span>
        ) : null}
      </div>
    </article>
  );
}
