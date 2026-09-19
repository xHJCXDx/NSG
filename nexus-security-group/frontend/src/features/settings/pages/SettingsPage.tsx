import { useState, useEffect } from 'react';
import { useAuth } from '../../auth';
import { SETTINGS_COPY } from '../contract';
import { PermissionMatrix } from '../components/PermissionMatrix';
import { SystemInfoCard } from '../components/SystemInfoCard';
import { usePermissionsQuery } from '../hooks/usePermissionsQuery';
import { useUpdateRoleMutation } from '../hooks/useUpdateRoleMutation';
import { useHealthQuery } from '../hooks/useHealthQuery';
import { UpdatePermissionsError } from '../api';
import type { RoleName } from '../types';

export function SettingsPage() {
  const { hasPermission } = useAuth();
  const canWrite = hasPermission('permissions', 'write');
  const { data, isLoading, error } = usePermissionsQuery();
  const updateMutation = useUpdateRoleMutation();
  const { data: health, isLoading: isLoadingHealth } = useHealthQuery();

  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!successMessage) return;
    const timer = setTimeout(() => setSuccessMessage(null), 5000);
    return () => clearTimeout(timer);
  }, [successMessage]);

  useEffect(() => {
    if (!errorMessage) return;
    const timer = setTimeout(() => setErrorMessage(null), 8000);
    return () => clearTimeout(timer);
  }, [errorMessage]);

  const handleSave = (role: RoleName, permissions: string[]) => {
    setSuccessMessage(null);
    setErrorMessage(null);
    updateMutation.mutate(
      { role, payload: { permissions } },
      {
        onSuccess: () => setSuccessMessage(SETTINGS_COPY.matrix.saveSuccess),
        onError: (err) =>
          setErrorMessage(err instanceof UpdatePermissionsError ? err.message : SETTINGS_COPY.errors.updateFallback),
      },
    );
  };

  return (
    <section className="space-y-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-wide text-brand-400">
          {SETTINGS_COPY.page.eyebrow}
        </p>
        <h1 className="mt-2 text-3xl font-bold text-white">{SETTINGS_COPY.page.title}</h1>
        <p className="mt-2 max-w-3xl text-gray-400">{SETTINGS_COPY.page.description}</p>
      </div>

      {!canWrite && (
        <div className="glass-card border-amber-500/20 bg-amber-500/5 p-4 text-sm text-amber-100" role="note">
          You have read-only access to settings. Contact an administrator to request changes.
        </div>
      )}

      {error && (
        <div className="glass-card border-red-500/20 bg-red-500/5 p-4 text-sm text-red-300" role="alert">
          {error instanceof Error ? error.message : SETTINGS_COPY.errors.fetchFallback}
        </div>
      )}

      {successMessage && (
        <div className="glass-card border-emerald-500/20 bg-emerald-500/5 p-4 text-sm text-emerald-300" role="status">
          {successMessage}
        </div>
      )}

      {errorMessage && (
        <div className="glass-card border-red-500/20 bg-red-500/5 p-4 text-sm text-red-300" role="alert">
          {errorMessage}
        </div>
      )}

      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500/30 border-t-brand-500" />
        </div>
      ) : data ? (
        <PermissionMatrix
          data={data}
          canWrite={canWrite}
          onSave={handleSave}
          isSaving={updateMutation.isPending}
        />
      ) : null}

      <SystemInfoCard health={health} isLoading={isLoadingHealth} />
    </section>
  );
}
