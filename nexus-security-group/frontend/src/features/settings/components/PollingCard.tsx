import { usePolling } from '../../../shared/contexts/PollingContext';
import type { PollingInterval } from '../../../shared/contexts/PollingContext';
import { useTranslation } from '../../../shared/i18n/translations';

const OPTIONS: PollingInterval[] = [15000, 30000, 60000, 300000, false];

function toSelectValue(interval: PollingInterval): string {
  return String(interval);
}

function fromSelectValue(value: string): PollingInterval {
  if (value === 'false') return false;
  const n = Number(value);
  if (n === 15000 || n === 30000 || n === 60000 || n === 300000) return n;
  return 30000;
}

export function PollingCard() {
  const { pollingInterval, setPollingInterval } = usePolling();
  const t = useTranslation();

  return (
    <div className="glass-card p-6">
      <h2 className="mb-4 text-lg font-semibold text-content-heading">{t.settings.polling.title}</h2>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-content-secondary">{t.settings.polling.label}</p>
          <p className="text-sm text-content-muted">{t.settings.polling.description}</p>
        </div>
        <select
          value={toSelectValue(pollingInterval)}
          onChange={(e) => setPollingInterval(fromSelectValue(e.target.value))}
          aria-label={t.settings.polling.label}
          className="rounded-lg border border-edge bg-surface-hover px-4 py-2 text-sm font-medium text-content-secondary transition-colors hover:bg-surface-secondary focus:outline-none focus:ring-2 focus:ring-brand-500/50"
        >
          {OPTIONS.map((opt) => {
            const key = toSelectValue(opt) as keyof typeof t.settings.polling.options;
            return (
              <option key={key} value={key} className="bg-surface-primary text-content-primary">
                {t.settings.polling.options[key]}
              </option>
            );
          })}
        </select>
      </div>
    </div>
  );
}
