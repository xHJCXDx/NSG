import { AutomationTriggers } from './AutomationTriggers';
import { useTranslation } from '../../shared/i18n/translations';

export function AutomationPage() {
  const t = useTranslation();

  return (
    <section className="space-y-6" aria-labelledby="automation-page-title">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-brand-400">
          {t.automation.eyebrow}
        </p>
        <h1 id="automation-page-title" className="mt-2 text-3xl font-bold text-content-heading">
          {t.automation.title}
        </h1>
        <p className="mt-2 max-w-3xl text-content-secondary">
          {t.automation.pageDescription}
        </p>
      </div>

      <AutomationTriggers />
    </section>
  );
}
