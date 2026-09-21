import { Moon, Sun } from 'lucide-react';
import { useAuth } from '../../auth';
import { ComplianceCard } from '../components/ComplianceCard';
import { ProfileCard } from '../components/ProfileCard';
import { SystemInfoCard } from '../components/SystemInfoCard';
import { useHealthQuery } from '../hooks/useHealthQuery';
import { useTheme } from '../../../shared/contexts/ThemeContext';
import { useLanguage } from '../../../shared/contexts/LanguageContext';
import { useTranslation } from '../../../shared/i18n/translations';

export function SettingsPage() {
  const { hasPermission } = useAuth();
  const canWrite = hasPermission('permissions', 'write');
  const { theme, toggleTheme } = useTheme();
  const { language, setLanguage } = useLanguage();
  const t = useTranslation();
  const { data: health, isLoading: isLoadingHealth } = useHealthQuery();

  return (
    <section className="space-y-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-wide text-brand-400">
          {t.settings.eyebrow}
        </p>
        <h1 className="mt-2 text-3xl font-bold text-content-heading">{t.settings.title}</h1>
        <p className="mt-2 max-w-3xl text-content-secondary">{t.settings.description}</p>
      </div>

      {!canWrite && (
        <div className="glass-card border-amber-500/20 bg-amber-500/5 p-4 text-sm text-amber-600 dark:text-amber-100" role="note">
          {t.settings.readOnlyNotice}
        </div>
      )}

      <ProfileCard />

      <div className="glass-card p-6">
        <h2 className="mb-4 text-lg font-semibold text-content-heading">{t.settings.theme.title}</h2>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-content-secondary">{t.settings.theme.appearance}</p>
            <p className="text-sm text-content-muted">
              {theme === 'dark' ? t.settings.theme.currentDark : t.settings.theme.currentLight}
            </p>
          </div>
          <button
            type="button"
            onClick={toggleTheme}
            aria-label={theme === 'dark' ? t.settings.theme.switchToLightAria : t.settings.theme.switchToDarkAria}
            className="flex items-center gap-2 rounded-lg border border-edge bg-surface-hover px-4 py-2 text-sm font-medium text-content-secondary transition-colors hover:bg-surface-secondary"
          >
            {theme === 'dark' ? (
              <>
                <Sun size={16} />
                {t.settings.theme.switchToLight}
              </>
            ) : (
              <>
                <Moon size={16} />
                {t.settings.theme.switchToDark}
              </>
            )}
          </button>
        </div>
      </div>

      <div className="glass-card p-6">
        <h2 className="mb-4 text-lg font-semibold text-content-heading">{t.settings.language.title}</h2>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-content-secondary">{t.settings.language.label}</p>
            <p className="text-sm text-content-muted">{t.settings.language.description}</p>
          </div>
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value as 'en' | 'es')}
            aria-label={t.settings.language.label}
            className="rounded-lg border border-edge bg-surface-hover px-4 py-2 text-sm font-medium text-content-secondary transition-colors hover:bg-surface-secondary focus:outline-none focus:ring-2 focus:ring-brand-500/50"
          >
            <option value="en" className="bg-surface-primary text-content-primary">{t.settings.language.en}</option>
            <option value="es" className="bg-surface-primary text-content-primary">{t.settings.language.es}</option>
          </select>
        </div>
      </div>

      <SystemInfoCard health={health} isLoading={isLoadingHealth} />

      <ComplianceCard />
    </section>
  );
}
