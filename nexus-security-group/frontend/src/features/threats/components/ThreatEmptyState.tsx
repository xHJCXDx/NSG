import type { ThreatEmptyReason } from '../hooks/useThreats';

interface ThreatEmptyStateProps {
  reason: ThreatEmptyReason;
}

export function ThreatEmptyState({ reason }: ThreatEmptyStateProps) {
  const copy =
    reason === 'no-results'
      ? {
          title: 'No matching threats',
          description: 'Try adjusting the search, severity, or classification filter.',
        }
      : {
          title: 'No threats detected yet',
          description: 'Detected OSINT threats will appear here when the backend exposes them.',
        };

  return (
    <div className="glass-card p-8 text-center border-dashed border-white/10">
      <h2 className="text-xl font-bold text-white">{copy.title}</h2>
      <p className="mt-2 text-gray-400">{copy.description}</p>
    </div>
  );
}
