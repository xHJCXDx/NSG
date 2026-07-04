import type { MentionFilters } from '../types';

interface MentionsToolbarProps {
  filters: MentionFilters;
  onFiltersChange: (filters: MentionFilters) => void;
}

export function MentionsToolbar({ filters, onFiltersChange }: MentionsToolbarProps) {
  return (
    <div className="glass-card p-4 flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
      <label className="flex-1 text-sm text-gray-300">
        <span className="sr-only">Search mentions</span>
        <input
          value={filters.search}
          onChange={(event) => onFiltersChange({ ...filters, search: event.target.value })}
          placeholder="Search by text, platform, or author"
          className="w-full rounded-xl border border-white/10 bg-dark-800/80 px-4 py-3 text-gray-100 placeholder:text-gray-500 focus:border-brand-400 focus:outline-none"
        />
      </label>

      <label className="md:w-56 text-sm text-gray-300">
        <span className="sr-only">Filter by platform</span>
        <input
          value={filters.platform}
          onChange={(event) => onFiltersChange({ ...filters, platform: event.target.value })}
          placeholder="Platform"
          className="w-full rounded-xl border border-white/10 bg-dark-800/80 px-4 py-3 text-gray-100 placeholder:text-gray-500 focus:border-brand-400 focus:outline-none"
        />
      </label>
    </div>
  );
}
