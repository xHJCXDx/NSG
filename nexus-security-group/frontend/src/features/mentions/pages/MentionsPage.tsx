import { useAuth } from '../../auth/AuthContext';
import { MentionEmptyState } from '../components/MentionEmptyState';
import { MentionErrorState } from '../components/MentionErrorState';
import { MentionsList } from '../components/MentionsList';
import { MentionsToolbar } from '../components/MentionsToolbar';
import { useMentions } from '../hooks/useMentions';

export function MentionsPage() {
  const { token } = useAuth();
  const { filteredMentions, status, error, filters, setFilters, emptyReason } = useMentions(token);

  return (
    <section className="space-y-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-wide text-brand-400">OSINT monitoring</p>
        <h1 className="mt-2 text-3xl font-bold text-white">Mentions</h1>
        <p className="mt-2 max-w-3xl text-gray-400">
          Review collected mentions with source, content, timestamp, and optional operational metadata.
        </p>
      </div>

      <MentionsToolbar filters={filters} onFiltersChange={setFilters} />

      {status === 'loading' && (
        <div className="glass-card p-8 text-gray-300" role="status">
          Loading mentions...
        </div>
      )}

      {status === 'error' && <MentionErrorState message={error} />}

      {status === 'empty' && <MentionEmptyState reason={emptyReason} />}


      {status === 'success' && <MentionsList mentions={filteredMentions} />}
    </section>
  );
}
