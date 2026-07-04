interface MentionErrorStateProps {
  message?: string | null;
}

export function MentionErrorState({ message }: MentionErrorStateProps) {
  const detail = message === 'Mentions could not be loaded' ? 'The information could not be loaded right now.' : message;

  return (
    <div className="glass-card p-8 border border-red-500/20 bg-red-500/5">
      <h2 className="text-xl font-bold text-red-300">Mentions could not be loaded</h2>
      <p className="mt-2 text-red-200/80">{detail ?? 'The information could not be loaded right now.'}</p>
    </div>
  );
}
