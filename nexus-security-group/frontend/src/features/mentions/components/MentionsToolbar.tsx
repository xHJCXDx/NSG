import type { MentionFilters } from '../types';
import { useTranslation } from '../../../shared/i18n/translations';

interface MentionsToolbarProps {
  filters: MentionFilters;
  availableFilters: {
    platformOptions: string[];
  };
  onFiltersChange: (filters: MentionFilters) => void;
}

export function MentionsToolbar({ filters, availableFilters, onFiltersChange }: MentionsToolbarProps) {
  const t = useTranslation();

  return (
    <div className="glass-card p-4 flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
      <label className="flex-1 text-sm text-content-secondary">
        <span className="sr-only">{t.mentions.toolbar.searchLabel}</span>
        <input
          value={filters.search}
          onChange={(event) => onFiltersChange({ ...filters, search: event.target.value })}
          placeholder={t.mentions.toolbar.searchPlaceholder}
          className="w-full rounded-xl border border-edge-input bg-surface-input px-4 py-3 text-content-primary placeholder:text-content-muted focus:border-brand-400 focus:outline-none"
        />
      </label>

      {availableFilters.platformOptions.length > 0 && (
        <label className="md:w-56 text-sm text-content-secondary">
          <span className="sr-only">{t.mentions.toolbar.platformLabel}</span>
          <select
            value={filters.platform}
            onChange={(event) => onFiltersChange({ ...filters, platform: event.target.value })}
            className="w-full rounded-xl border border-edge-input bg-surface-input px-4 py-3 text-content-primary focus:border-brand-400 focus:outline-none"
          >
            <option value="">{t.mentions.toolbar.platformPlaceholder}</option>
            {availableFilters.platformOptions.map((opt) => (
              <option key={opt} value={opt} className="bg-surface-primary text-content-primary">
                {opt.charAt(0).toUpperCase() + opt.slice(1)}
              </option>
            ))}
          </select>
        </label>
      )}
    </div>
  );
}
