import { useState } from 'react';
import { ExternalLink } from 'lucide-react';
import type { Mention } from '../types';
import { useTranslation } from '../../../shared/i18n/translations';

interface MentionCardProps {
  mention: Mention;
}

const SENTIMENT_STYLES: Record<string, { badge: string; border: string }> = {
  positive: {
    badge: 'border-green-400/30 bg-green-500/10 text-green-200',
    border: 'border-l-green-500',
  },
  neutral: {
    badge: 'border-slate-400/30 bg-slate-500/10 text-slate-200',
    border: 'border-l-slate-500',
  },
  negative: {
    badge: 'border-red-400/30 bg-red-500/10 text-red-200',
    border: 'border-l-red-500',
  },
};

const getSentimentStyles = (sentiment?: string) =>
  SENTIMENT_STYLES[sentiment?.toLowerCase() ?? ''] ?? {
    badge: 'border-edge bg-surface-hover text-content-secondary',
    border: 'border-l-edge',
  };

const isSafeUrl = (url: string) => /^https?:\/\//i.test(url);

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

const TEXT_TRUNCATE_LENGTH = 200;

export function MentionCard({ mention }: MentionCardProps) {
  const t = useTranslation();
  const [textExpanded, setTextExpanded] = useState(false);

  const { badge, border } = getSentimentStyles(mention.sentiment);

  const text = stripMarkdown(mention.text ?? '');
  const textTruncated = text.length > TEXT_TRUNCATE_LENGTH && !textExpanded;
  const displayText = textTruncated ? `${text.slice(0, TEXT_TRUNCATE_LENGTH)}…` : text;

  return (
    <article className={`glass-card p-5 space-y-4 border-l-4 ${border}`}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-wide text-brand-400 font-semibold">{mention.platform}</p>
          <p className="text-xs text-content-muted">{timeAgo(mention.createdAt, t.mentions.card.unknownDate)}</p>
        </div>
        <div className="flex flex-wrap gap-2 justify-end">
          {mention.sentiment && (
            <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${badge}`}>
              {mention.sentiment}
            </span>
          )}
          {mention.status && (
            <span className="rounded-full border border-edge px-3 py-1 text-xs text-content-secondary">
              {mention.status}
            </span>
          )}
        </div>
      </div>

      <p className="text-content-primary leading-relaxed">
        {displayText}
        {text.length > TEXT_TRUNCATE_LENGTH && (
          <button
            type="button"
            onClick={() => setTextExpanded((prev) => !prev)}
            className="ml-2 text-brand-400 text-xs hover:underline"
          >
            {textExpanded ? t.mentions.card.showLess : t.mentions.card.showMore}
          </button>
        )}
      </p>

      <div className="flex flex-wrap items-center gap-3 text-sm text-content-secondary">
        {mention.author && <span>{t.mentions.card.authorLabel}: {mention.author}</span>}
        {mention.sourceUrl && (
          isSafeUrl(mention.sourceUrl) ? (
            <a
              href={mention.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-brand-400 hover:text-brand-300"
            >
              {t.mentions.card.sourceLabel} <ExternalLink className="h-3 w-3" />
            </a>
          ) : (
            <span className="inline-flex items-center gap-1 text-content-muted">
              {t.mentions.card.sourceLabel} <ExternalLink className="h-3 w-3" />
            </span>
          )
        )}
      </div>
    </article>
  );
}
