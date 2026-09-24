import { useTranslation } from '../../../shared/i18n/translations';

interface ThreatErrorStateProps {
  message?: string | null;
  onRetry?: () => void;
}

export function ThreatErrorState({ message, onRetry }: ThreatErrorStateProps) {
  const t = useTranslation();

  const detail = message === t.threats.error.title ? t.threats.error.fallbackDetail : message;

  return (
    <div className="glass-card p-8 border border-red-500/20 bg-red-500/5">
      <h2 className="text-xl font-bold text-red-300">{t.threats.error.title}</h2>
      <p className="mt-2 text-red-200/80">{detail ?? t.threats.error.fallbackDetail}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-4 rounded-xl border border-red-400/30 px-4 py-2 text-sm font-semibold text-red-100 hover:bg-red-500/10"
        >
          {t.threats.error.retryLabel}
        </button>
      )}
    </div>
  );
}
