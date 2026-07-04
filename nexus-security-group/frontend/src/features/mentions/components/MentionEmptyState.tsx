import type { MentionEmptyReason } from '../hooks/useMentions';

interface MentionEmptyStateProps {
  reason: MentionEmptyReason;
}

export function MentionEmptyState({ reason }: MentionEmptyStateProps) {
  const copy =
    reason === 'no-results'
      ? {
          title: 'No matching mentions',
          description: 'Try adjusting the search or platform filter.',
        }
      : {
          title: 'No mentions collected yet',
          description: 'Collected OSINT mentions will appear here once available.',
        };

  return (
    <div className="glass-card p-8 text-center border-dashed border-white/10">
      <h2 className="text-xl font-bold text-white">{copy.title}</h2>
      <p className="mt-2 text-gray-400">{copy.description}</p>
    </div>
  );
}
