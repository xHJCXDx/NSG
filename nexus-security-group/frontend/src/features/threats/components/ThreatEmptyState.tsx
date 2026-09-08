import { THREATS_COPY } from '../contract';
import type { ThreatEmptyReason } from '../hooks/useThreats';

interface ThreatEmptyStateProps {
  reason: ThreatEmptyReason;
}

export function ThreatEmptyState({ reason }: ThreatEmptyStateProps) {
  const copy =
    reason === 'no-results'
      ? THREATS_COPY.empty.noResults
      : THREATS_COPY.empty.initial;

  return (
    <div className="glass-card p-8 text-center border-dashed border-white/10">
      <h2 className="text-xl font-bold text-white">{copy.title}</h2>
      <p className="mt-2 text-gray-400">{copy.description}</p>
    </div>
  );
}
