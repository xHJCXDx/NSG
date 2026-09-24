import { ThreatEmptyState } from '../components/ThreatEmptyState';
import { ThreatErrorState } from '../components/ThreatErrorState';
import { ThreatsList } from '../components/ThreatsList';
import { ThreatsToolbar } from '../components/ThreatsToolbar';
import { useThreats } from '../hooks/useThreats';
import { useTranslation } from '../../../shared/i18n/translations';
import { Pagination } from '../../../shared/components/Pagination';

export function ThreatsPage() {
  const t = useTranslation();
  const { filteredThreats, status, error, filters, setFilters, availableFilters, emptyReason, reload, page, setPage, totalPages } = useThreats();

  return (
    <section className="space-y-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-wide text-brand-400">{t.threats.eyebrow}</p>
        <h1 className="mt-2 text-3xl font-bold text-content-heading">{t.threats.title}</h1>
        <p className="mt-2 max-w-3xl text-content-secondary">
          {t.threats.description}
        </p>
      </div>

      <ThreatsToolbar filters={filters} availableFilters={availableFilters} onFiltersChange={setFilters} />

      {status === 'loading' && (
        <div className="glass-card p-8 text-content-secondary" role="status">
          {t.threats.loading}
        </div>
      )}

      {status === 'error' && <ThreatErrorState message={error} onRetry={reload} />}

      {status === 'empty' && <ThreatEmptyState reason={emptyReason} />}

      {status === 'success' && <ThreatsList threats={filteredThreats} />}

      {status === 'success' && totalPages > 1 && (
        <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
      )}
    </section>
  );
}
