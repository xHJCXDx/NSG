interface ThreatErrorStateProps {
  message?: string | null;
  onRetry?: () => void;
}

export function ThreatErrorState({ message, onRetry }: ThreatErrorStateProps) {
  const detail = message === 'Threats could not be loaded' ? 'The information could not be loaded right now.' : message;

  return (
    <div className="glass-card p-8 border border-red-500/20 bg-red-500/5">
      <h2 className="text-xl font-bold text-red-300">Threats could not be loaded</h2>
      <p className="mt-2 text-red-200/80">{detail ?? 'The information could not be loaded right now.'}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-4 rounded-xl border border-red-400/30 px-4 py-2 text-sm font-semibold text-red-100 hover:bg-red-500/10"
        >
          Retry
        </button>
      )}
    </div>
  );
}
