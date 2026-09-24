import type { MentionEmptyReason } from '../hooks/useMentions';
import { useTranslation } from '../../../shared/i18n/translations';

interface MentionEmptyStateProps {
  reason: MentionEmptyReason;
}

export function MentionEmptyState({ reason }: MentionEmptyStateProps) {
  const t = useTranslation();

  const copy =
    reason === 'no-results'
      ? t.mentions.empty.noResults
      : t.mentions.empty.initial;

  return (
    <div className="glass-card p-8 text-center border-dashed border-edge">
      <h2 className="text-xl font-bold text-content-heading">{copy.title}</h2>
      <p className="mt-2 text-content-secondary">{copy.description}</p>
    </div>
  );
}
