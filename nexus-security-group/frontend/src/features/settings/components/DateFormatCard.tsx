import { useDateFormat } from '../../../shared/contexts/DateFormatContext';
import type { TimezoneOption, DateFormatOption, TimeFormatOption } from '../../../shared/contexts/DateFormatContext';
import { useTranslation } from '../../../shared/i18n/translations';

export function DateFormatCard() {
  const { timezone, dateFormat, timeFormat, setTimezone, setDateFormat, setTimeFormat } = useDateFormat();
  const t = useTranslation();
  const td = t.settings.dateFormat;

  return (
    <div className="glass-card p-6 space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-content-heading">{td.title}</h2>
        <p className="mt-1 text-sm text-content-muted">{td.description}</p>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-content-secondary">{td.timezone.label}</p>
        <select
          value={timezone}
          onChange={(e) => setTimezone(e.target.value as TimezoneOption)}
          aria-label={td.timezone.label}
          className="rounded-lg border border-edge bg-surface-hover px-4 py-2 text-sm font-medium text-content-secondary transition-colors hover:bg-surface-secondary focus:outline-none focus:ring-2 focus:ring-brand-500/50"
        >
          <option value="local" className="bg-surface-primary text-content-primary">{td.timezone.local}</option>
          <option value="UTC" className="bg-surface-primary text-content-primary">{td.timezone.utc}</option>
          <option value="America/Argentina/Buenos_Aires" className="bg-surface-primary text-content-primary">{td.timezone.buenosAires}</option>
        </select>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-content-secondary">{td.format.label}</p>
        <select
          value={dateFormat}
          onChange={(e) => setDateFormat(e.target.value as DateFormatOption)}
          aria-label={td.format.label}
          className="rounded-lg border border-edge bg-surface-hover px-4 py-2 text-sm font-medium text-content-secondary transition-colors hover:bg-surface-secondary focus:outline-none focus:ring-2 focus:ring-brand-500/50"
        >
          <option value="iso" className="bg-surface-primary text-content-primary">{td.format.iso}</option>
          <option value="ar" className="bg-surface-primary text-content-primary">{td.format.ar}</option>
          <option value="us" className="bg-surface-primary text-content-primary">{td.format.us}</option>
        </select>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-content-secondary">{td.timeFormat.label}</p>
        <select
          value={timeFormat}
          onChange={(e) => setTimeFormat(e.target.value as TimeFormatOption)}
          aria-label={td.timeFormat.label}
          className="rounded-lg border border-edge bg-surface-hover px-4 py-2 text-sm font-medium text-content-secondary transition-colors hover:bg-surface-secondary focus:outline-none focus:ring-2 focus:ring-brand-500/50"
        >
          <option value="24h" className="bg-surface-primary text-content-primary">{td.timeFormat.h24}</option>
          <option value="12h" className="bg-surface-primary text-content-primary">{td.timeFormat.h12}</option>
        </select>
      </div>
    </div>
  );
}
