import { ExternalLink } from 'lucide-react';
import { MENTIONS_COPY } from '../contract';
import type { Mention } from '../types';

interface MentionCardProps {
  mention: Mention;
}

const formatDate = (value: string) => {
  if (!value) {
    return MENTIONS_COPY.card.unknownDate;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
};

export function MentionCard({ mention }: MentionCardProps) {
  return (
    <article className="glass-card p-5 space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-wide text-brand-400 font-semibold">{mention.platform}</p>
          <p className="text-xs text-gray-500">{formatDate(mention.createdAt)}</p>
        </div>
        <div className="flex flex-wrap gap-2 justify-end">
          {mention.sentiment && (
            <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-gray-300">
              {mention.sentiment}
            </span>
          )}
          {mention.status && (
            <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-gray-300">
              {mention.status}
            </span>
          )}
        </div>
      </div>

      <p className="text-gray-100 leading-relaxed">{mention.text}</p>

      <div className="flex flex-wrap items-center gap-3 text-sm text-gray-400">
        {mention.author && <span>{MENTIONS_COPY.card.authorLabel}: {mention.author}</span>}
        {mention.sourceUrl && (
          <a href={mention.sourceUrl} className="inline-flex items-center gap-1 text-brand-400 hover:text-brand-300">
            {MENTIONS_COPY.card.sourceLabel} <ExternalLink className="h-3 w-3" />
          </a>
        )}
      </div>
    </article>
  );
}
