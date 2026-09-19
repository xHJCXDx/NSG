import { Activity, Database, Globe, Tag } from 'lucide-react';
import type { HealthResponse } from '../types';
import { useTranslation } from '../../../shared/i18n/translations';

interface SystemInfoCardProps {
  health: HealthResponse | undefined;
  isLoading: boolean;
}

function StatusDot({ ok }: { ok: boolean }) {
  return (
    <span
      className={`inline-block h-2 w-2 rounded-full ${ok ? 'bg-emerald-400' : 'bg-red-400'}`}
      aria-hidden="true"
    />
  );
}

function InfoRow({ icon: Icon, label, value, ok }: { icon: typeof Activity; label: string; value: string; ok?: boolean }) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-edge-card last:border-0">
      <div className="flex items-center gap-3 text-content-secondary">
        <Icon aria-hidden="true" className="h-4 w-4" />
        <span className="text-sm">{label}</span>
      </div>
      <div className="flex items-center gap-2 text-sm text-content-primary">
        {ok !== undefined && <StatusDot ok={ok} />}
        {value}
      </div>
    </div>
  );
}

export function SystemInfoCard({ health, isLoading }: SystemInfoCardProps) {
  const t = useTranslation();
  const si = t.settings.systemInfo;
  const apiOk = health?.status === 'healthy';
  const dbOk = health?.db === 'connected';

  return (
    <div className="glass-card p-6">
      <div className="mb-4">
        <h2 className="text-xl font-bold text-content-heading">{si.title}</h2>
        <p className="mt-1 text-sm text-content-secondary">{si.description}</p>
      </div>

      {isLoading ? (
        <div className="flex h-32 items-center justify-center">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-500/30 border-t-brand-500" />
        </div>
      ) : (
        <div>
          <InfoRow icon={Tag} label={si.version} value="1.0.0" />
          <InfoRow icon={Globe} label={si.environment} value={import.meta.env.MODE} />
          <InfoRow
            icon={Activity}
            label={si.apiStatus}
            value={apiOk ? si.healthy : si.unavailable}
            ok={apiOk}
          />
          <InfoRow
            icon={Database}
            label={si.database}
            value={dbOk ? si.connected : si.unavailable}
            ok={dbOk}
          />
        </div>
      )}
    </div>
  );
}
