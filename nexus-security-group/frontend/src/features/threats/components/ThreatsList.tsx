import type { Threat } from '../types';
import { ThreatCard } from './ThreatCard';
import { useTranslation } from '../../../shared/i18n/translations';

interface ThreatsListProps {
  threats: Threat[];
}

export function ThreatsList({ threats }: ThreatsListProps) {
  const t = useTranslation();

  return (
    <ul className="space-y-4" aria-label={t.threats.list.ariaLabel}>
      {threats.map((threat) => (
        <li key={threat.id}>
          <ThreatCard threat={threat} />
        </li>
      ))}
    </ul>
  );
}
