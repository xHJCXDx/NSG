import { Link } from 'react-router-dom';
import { useTranslation } from '../../shared/i18n/translations';

export function NotFoundPage() {
  const t = useTranslation();

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-surface-primary text-content-primary">
      <h1 className="text-6xl font-bold text-brand-500 mb-4">404</h1>
      <p className="text-xl text-content-muted mb-8">{t.notFound.message}</p>
      <Link
        to="/"
        className="px-6 py-3 bg-brand-500 text-white rounded-xl hover:bg-brand-600 transition-all"
      >
        {t.notFound.backToDashboard}
      </Link>
    </div>
  );
}
