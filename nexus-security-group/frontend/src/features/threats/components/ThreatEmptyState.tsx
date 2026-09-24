import type { ThreatEmptyReason } from '../hooks/useThreats';
import { useTranslation } from '../../../shared/i18n/translations';

interface ThreatEmptyStateProps {
  reason: ThreatEmptyReason;
}

export function ThreatEmptyState({ reason }: ThreatEmptyStateProps) {
  const t = useTranslation();

  const copy =
    reason === 'no-results'
      ? t.threats.empty.noResults
      : t.threats.empty.initial;

  return (
    <div className="glass-card p-8 text-center border-dashed border-edge">
      <h2 className="text-xl font-bold text-content-heading">{copy.title}</h2>
      <p className="mt-2 text-content-secondary">{copy.description}</p>
    </div>
  );
}
