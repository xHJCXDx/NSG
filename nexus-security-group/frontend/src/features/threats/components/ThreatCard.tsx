import { THREATS_COPY } from '../contract';
import type { Threat } from '../types';

interface ThreatCardProps {
  threat: Threat;
}

const formatDate = (value: string) => {
  if (!value) {
    return THREATS_COPY.card.unknownDate;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
};

const formatPercent = (value: number) => `${Math.round(value * 100)}%`;

export function ThreatCard({ threat }: ThreatCardProps) {
  return (
    <article className="glass-card p-5 space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-wide text-brand-400 font-semibold">{threat.type}</p>
          <h2 className="mt-1 text-xl font-bold text-white">{threat.category ?? THREATS_COPY.card.fallbackCategory}</h2>
          <p className="text-xs text-gray-500">{THREATS_COPY.card.detectedLabel}: {formatDate(threat.detectedAt)}</p>
        </div>
        <div className="flex flex-wrap gap-2 justify-end">
          <span className="rounded-full border border-red-400/30 bg-red-500/10 px-3 py-1 text-xs font-semibold text-red-200">
            {threat.severity}
          </span>
          <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-gray-300">
            {THREATS_COPY.card.confidenceLabel} {formatPercent(threat.confidence)}
          </span>
          {threat.riskScore !== null && threat.riskScore !== undefined && (
            <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-gray-300">
              {THREATS_COPY.card.riskLabel} {threat.riskScore}
            </span>
          )}
        </div>
      </div>

      {threat.summary && <p className="text-gray-100 leading-relaxed">{threat.summary}</p>}

      {threat.evidence && threat.evidence.length > 0 && (
        <div>
          <p className="text-sm font-semibold text-gray-300">{THREATS_COPY.card.evidenceLabel}</p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-gray-400">
            {threat.evidence.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3 text-sm text-gray-400">
        {threat.source && <span>{THREATS_COPY.card.sourceLabel}: {threat.source}</span>}
        {threat.relatedMention ? (
          <span>
            {THREATS_COPY.card.relatedMentionLabel}: {threat.relatedMention.text ?? threat.relatedMention.id}
            {threat.relatedMention.platform ? ` (${threat.relatedMention.platform})` : ''}
          </span>
        ) : threat.mentionId ? (
          <span>{THREATS_COPY.card.relatedMentionIdLabel}: {threat.mentionId}</span>
        ) : (
          <span>{THREATS_COPY.card.noRelatedMention}</span>
        )}
      </div>
    </article>
  );
}
