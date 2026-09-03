import { MENTIONS_COPY } from '../contract';
import type { MentionEmptyReason } from '../hooks/useMentions';

interface MentionEmptyStateProps {
  reason: MentionEmptyReason;
}

export function MentionEmptyState({ reason }: MentionEmptyStateProps) {
  const copy =
    reason === 'no-results'
      ? MENTIONS_COPY.empty.noResults
      : MENTIONS_COPY.empty.initial;

  return (
    <div className="glass-card p-8 text-center border-dashed border-white/10">
      <h2 className="text-xl font-bold text-white">{copy.title}</h2>
      <p className="mt-2 text-gray-400">{copy.description}</p>
    </div>
  );
}
