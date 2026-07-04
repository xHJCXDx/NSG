import type { Mention } from '../types';
import { MentionCard } from './MentionCard';

interface MentionsListProps {
  mentions: Mention[];
}

export function MentionsList({ mentions }: MentionsListProps) {
  return (
    <div className="space-y-4" aria-label="Collected mentions">
      {mentions.map((mention) => (
        <MentionCard key={mention.id} mention={mention} />
      ))}
    </div>
  );
}
