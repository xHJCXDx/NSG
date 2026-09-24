import type { ThreatFilters } from '../types';
import { useTranslation } from '../../../shared/i18n/translations';

interface ThreatsToolbarProps {
  filters: ThreatFilters;
  availableFilters: {
    severity: boolean;
    classification: boolean;
    severityOptions: string[];
    classificationOptions: string[];
  };
  onFiltersChange: (filters: ThreatFilters) => void;
}

export function ThreatsToolbar({ filters, availableFilters, onFiltersChange }: ThreatsToolbarProps) {
  const t = useTranslation();

  return (
    <div className="glass-card p-4 flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
      <label className="flex-1 text-sm text-content-secondary">
        <span className="sr-only">{t.threats.toolbar.searchLabel}</span>
        <input
          value={filters.search}
          onChange={(event) => onFiltersChange({ ...filters, search: event.target.value })}
          placeholder={t.threats.toolbar.searchPlaceholder}
          className="w-full rounded-xl border border-edge-input bg-surface-input px-4 py-3 text-content-primary placeholder:text-content-muted focus:border-brand-400 focus:outline-none"
        />
      </label>

      {availableFilters.severity && (
        <label className="md:w-48 text-sm text-content-secondary">
          <span className="sr-only">{t.threats.toolbar.severityLabel}</span>
          <select
            value={filters.severity}
            onChange={(event) => onFiltersChange({ ...filters, severity: event.target.value })}
            className="w-full rounded-xl border border-edge-input bg-surface-input px-4 py-3 text-content-primary focus:border-brand-400 focus:outline-none"
          >
            <option value="">{t.threats.toolbar.severityPlaceholder}</option>
            {availableFilters.severityOptions.map((opt) => (
              <option key={opt} value={opt} className="bg-surface-primary text-content-primary">
                {opt.charAt(0).toUpperCase() + opt.slice(1)}
              </option>
            ))}
          </select>
        </label>
      )}

      {availableFilters.classification && (
        <label className="md:w-56 text-sm text-content-secondary">
          <span className="sr-only">{t.threats.toolbar.classificationLabel}</span>
          <select
            value={filters.classification}
            onChange={(event) => onFiltersChange({ ...filters, classification: event.target.value })}
            className="w-full rounded-xl border border-edge-input bg-surface-input px-4 py-3 text-content-primary focus:border-brand-400 focus:outline-none"
          >
            <option value="">{t.threats.toolbar.classificationPlaceholder}</option>
            {availableFilters.classificationOptions.map((opt) => (
              <option key={opt} value={opt} className="bg-surface-primary text-content-primary">
                {opt.charAt(0).toUpperCase() + opt.slice(1)}
              </option>
            ))}
          </select>
        </label>
      )}

      <label className="md:w-48 text-sm text-content-secondary">
        <span className="sr-only">{t.threats.toolbar.reviewStatusLabel}</span>
        <select
          value={filters.reviewStatus}
          onChange={(event) => onFiltersChange({ ...filters, reviewStatus: event.target.value })}
          className="w-full rounded-xl border border-edge-input bg-surface-input px-4 py-3 text-content-primary focus:border-brand-400 focus:outline-none"
        >
          <option value="">{t.threats.toolbar.allStatuses}</option>
          {(['pending', 'reviewing', 'investigating', 'confirmed', 'false_positive', 'resolved'] as const).map((status) => (
            <option key={status} value={status} className="bg-surface-primary text-content-primary">
              {t.analytics.reviewStatus[status]}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
