import { useTranslation } from '../../../shared/i18n/translations';

interface MentionErrorStateProps {
  message?: string | null;
}

export function MentionErrorState({ message }: MentionErrorStateProps) {
  const t = useTranslation();

  const detail = message === t.mentions.error.title ? t.mentions.error.fallbackDetail : message;

  return (
    <div className="glass-card p-8 border border-red-500/20 bg-red-500/5">
      <h2 className="text-xl font-bold text-red-300">{t.mentions.error.title}</h2>
      <p className="mt-2 text-red-200/80">{detail ?? t.mentions.error.fallbackDetail}</p>
    </div>
  );
}
