import { useAuth } from '../../auth/AuthContext';
import { ThreatEmptyState } from '../components/ThreatEmptyState';
import { ThreatErrorState } from '../components/ThreatErrorState';
import { ThreatsList } from '../components/ThreatsList';
import { ThreatsToolbar } from '../components/ThreatsToolbar';
import { useThreats } from '../hooks/useThreats';

export function ThreatsPage() {
  const { token } = useAuth();
  const { filteredThreats, status, error, filters, setFilters, availableFilters, emptyReason, reload } = useThreats(token);

  return (
    <section className="space-y-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-wide text-brand-400">OSINT monitoring</p>
        <h1 className="mt-2 text-3xl font-bold text-white">Threats</h1>
        <p className="mt-2 max-w-3xl text-gray-400">
          Review detected threats with severity, classification, confidence, evidence, and optional mention context.
        </p>
      </div>

      <ThreatsToolbar filters={filters} availableFilters={availableFilters} onFiltersChange={setFilters} />

      {status === 'loading' && (
        <div className="glass-card p-8 text-gray-300" role="status">
          Loading threats...
        </div>
      )}

      {status === 'error' && <ThreatErrorState message={error} onRetry={reload} />}

      {status === 'empty' && <ThreatEmptyState reason={emptyReason} />}

      {status === 'success' && <ThreatsList threats={filteredThreats} />}
    </section>
  );
}
