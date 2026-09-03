import { MENTIONS_COPY } from '../contract';

interface MentionErrorStateProps {
  message?: string | null;
}

export function MentionErrorState({ message }: MentionErrorStateProps) {
  const detail = message === MENTIONS_COPY.error.title ? MENTIONS_COPY.error.fallbackDetail : message;

  return (
    <div className="glass-card p-8 border border-red-500/20 bg-red-500/5">
      <h2 className="text-xl font-bold text-red-300">{MENTIONS_COPY.error.title}</h2>
      <p className="mt-2 text-red-200/80">{detail ?? MENTIONS_COPY.error.fallbackDetail}</p>
    </div>
  );
}
