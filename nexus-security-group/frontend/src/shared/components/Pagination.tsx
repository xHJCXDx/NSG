import { useTranslation } from '../i18n/translations';

interface PaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export function Pagination({ page, totalPages, onPageChange }: PaginationProps) {
  const t = useTranslation();

  const label = t.pagination.pageOf
    .replace('{page}', String(page))
    .replace('{totalPages}', String(totalPages));

  return (
    <div className="flex items-center justify-center gap-4 pt-2">
      <button
        type="button"
        onClick={() => onPageChange(page - 1)}
        disabled={page <= 1}
        className="rounded border border-edge bg-surface-hover px-3 py-1.5 text-sm text-content-primary transition-opacity disabled:cursor-not-allowed disabled:opacity-40 hover:not-disabled:opacity-80"
      >
        {t.pagination.previous}
      </button>

      <span className="text-sm text-content-secondary">{label}</span>

      <button
        type="button"
        onClick={() => onPageChange(page + 1)}
        disabled={page >= totalPages}
        className="rounded border border-edge bg-surface-hover px-3 py-1.5 text-sm text-content-primary transition-opacity disabled:cursor-not-allowed disabled:opacity-40 hover:not-disabled:opacity-80"
      >
        {t.pagination.next}
      </button>
    </div>
  );
}
