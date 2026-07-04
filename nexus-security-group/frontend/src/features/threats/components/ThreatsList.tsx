import type { Threat } from '../types';
import { ThreatCard } from './ThreatCard';

interface ThreatsListProps {
  threats: Threat[];
}

export function ThreatsList({ threats }: ThreatsListProps) {
  return (
    <div className="space-y-4" aria-label="Detected threats">
      {threats.map((threat) => (
        <ThreatCard key={threat.id} threat={threat} />
      ))}
    </div>
  );
}
