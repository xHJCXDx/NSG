import { Activity, Database, Globe, Tag } from 'lucide-react';
import { SETTINGS_COPY } from '../contract';
import type { HealthResponse } from '../types';

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
    <div className="flex items-center justify-between py-3 border-b border-white/5 last:border-0">
      <div className="flex items-center gap-3 text-gray-400">
        <Icon aria-hidden="true" className="h-4 w-4" />
        <span className="text-sm">{label}</span>
      </div>
      <div className="flex items-center gap-2 text-sm text-white">
        {ok !== undefined && <StatusDot ok={ok} />}
        {value}
      </div>
    </div>
  );
}

export function SystemInfoCard({ health, isLoading }: SystemInfoCardProps) {
  const apiOk = health?.status === 'healthy';
  const dbOk = health?.db === 'connected';

  return (
    <div className="glass-card p-6">
      <div className="mb-4">
        <h2 className="text-xl font-bold text-white">{SETTINGS_COPY.systemInfo.title}</h2>
        <p className="mt-1 text-sm text-gray-400">{SETTINGS_COPY.systemInfo.description}</p>
      </div>

      {isLoading ? (
        <div className="flex h-32 items-center justify-center">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-500/30 border-t-brand-500" />
        </div>
      ) : (
        <div>
          <InfoRow icon={Tag} label={SETTINGS_COPY.systemInfo.version} value="1.0.0" />
          <InfoRow icon={Globe} label={SETTINGS_COPY.systemInfo.environment} value={import.meta.env.MODE} />
          <InfoRow
            icon={Activity}
            label={SETTINGS_COPY.systemInfo.apiStatus}
            value={apiOk ? SETTINGS_COPY.systemInfo.healthy : SETTINGS_COPY.systemInfo.unavailable}
            ok={apiOk}
          />
          <InfoRow
            icon={Database}
            label={SETTINGS_COPY.systemInfo.database}
            value={dbOk ? SETTINGS_COPY.systemInfo.connected : SETTINGS_COPY.systemInfo.unavailable}
            ok={dbOk}
          />
        </div>
      )}
    </div>
  );
}
