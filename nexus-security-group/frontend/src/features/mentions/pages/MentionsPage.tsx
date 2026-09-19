import { MentionEmptyState } from '../components/MentionEmptyState';
import { MentionErrorState } from '../components/MentionErrorState';
import { MentionsList } from '../components/MentionsList';
import { MentionsToolbar } from '../components/MentionsToolbar';
import { useMentions } from '../hooks/useMentions';
import { useTranslation } from '../../../shared/i18n/translations';

export function MentionsPage() {
  const t = useTranslation();
  const { filteredMentions, status, error, filters, setFilters, emptyReason, availableFilters } = useMentions();

  return (
    <section className="space-y-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-wide text-brand-400">{t.mentions.eyebrow}</p>
        <h1 className="mt-2 text-3xl font-bold text-content-heading">{t.mentions.title}</h1>
        <p className="mt-2 max-w-3xl text-content-secondary">
          {t.mentions.description}
        </p>
      </div>

      <MentionsToolbar filters={filters} availableFilters={availableFilters} onFiltersChange={setFilters} />

      {status === 'loading' && (
        <div className="glass-card p-8 text-content-secondary" role="status">
          {t.mentions.loading}
        </div>
      )}

      {status === 'error' && <MentionErrorState message={error} />}

      {status === 'empty' && <MentionEmptyState reason={emptyReason} />}

      {status === 'success' && <MentionsList mentions={filteredMentions} />}
    </section>
  );
}
