import type { ThreatFilters } from '../types';

interface ThreatsToolbarProps {
  filters: ThreatFilters;
  availableFilters: {
    severity: boolean;
    classification: boolean;
  };
  onFiltersChange: (filters: ThreatFilters) => void;
}

export function ThreatsToolbar({ filters, availableFilters, onFiltersChange }: ThreatsToolbarProps) {
  return (
    <div className="glass-card p-4 flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
      <label className="flex-1 text-sm text-gray-300">
        <span className="sr-only">Search threats</span>
        <input
          value={filters.search}
          onChange={(event) => onFiltersChange({ ...filters, search: event.target.value })}
          placeholder="Search by evidence, summary, source, or mention"
          className="w-full rounded-xl border border-white/10 bg-dark-800/80 px-4 py-3 text-gray-100 placeholder:text-gray-500 focus:border-brand-400 focus:outline-none"
        />
      </label>

      {availableFilters.severity && (
        <label className="md:w-48 text-sm text-gray-300">
          <span className="sr-only">Filter by severity</span>
          <input
            value={filters.severity}
            onChange={(event) => onFiltersChange({ ...filters, severity: event.target.value })}
            placeholder="Severity"
            className="w-full rounded-xl border border-white/10 bg-dark-800/80 px-4 py-3 text-gray-100 placeholder:text-gray-500 focus:border-brand-400 focus:outline-none"
          />
        </label>
      )}

      {availableFilters.classification && (
        <label className="md:w-56 text-sm text-gray-300">
          <span className="sr-only">Filter by classification</span>
          <input
            value={filters.classification}
            onChange={(event) => onFiltersChange({ ...filters, classification: event.target.value })}
            placeholder="Classification"
            className="w-full rounded-xl border border-white/10 bg-dark-800/80 px-4 py-3 text-gray-100 placeholder:text-gray-500 focus:border-brand-400 focus:outline-none"
          />
        </label>
      )}
    </div>
  );
}
