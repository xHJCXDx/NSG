import type { Mention } from '../types';
import { MentionCard } from './MentionCard';
import { useTranslation } from '../../../shared/i18n/translations';

interface MentionsListProps {
  mentions: Mention[];
}

export function MentionsList({ mentions }: MentionsListProps) {
  const t = useTranslation();

  return (
    <div className="space-y-4" aria-label={t.mentions.list.ariaLabel}>
      {mentions.map((mention) => (
        <MentionCard key={mention.id} mention={mention} />
      ))}
    </div>
  );
}
