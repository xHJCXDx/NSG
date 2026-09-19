import { useState, useEffect, Fragment } from 'react';
import { Lock, Save } from 'lucide-react';
import type { PermissionMatrixResponse, RoleName } from '../types';
import { useTranslation } from '../../../shared/i18n/translations';

interface PermissionMatrixProps {
  data: PermissionMatrixResponse;
  canWrite: boolean;
  onSave: (role: RoleName, permissions: string[]) => void;
  isSaving: boolean;
}

export function PermissionMatrix({ data, canWrite, onSave, isSaving }: PermissionMatrixProps) {
  const t = useTranslation();

  const [analystPermissions, setAnalystPermissions] = useState<Set<string>>(
    () => new Set(data.role_permissions.analyst),
  );

  useEffect(() => {
    setAnalystPermissions(new Set(data.role_permissions.analyst));
  }, [data]);

  const originalSet = new Set(data.role_permissions.analyst);
  const isDirty =
    analystPermissions.size !== originalSet.size ||
    [...analystPermissions].some((p) => !originalSet.has(p));

  const handleToggle = (permission: string) => {
    setAnalystPermissions((prev) => {
      const next = new Set(prev);
      if (next.has(permission)) {
        next.delete(permission);
      } else {
        next.add(permission);
      }
      return next;
    });
  };

  const handleSave = () => {
    onSave('analyst', [...analystPermissions].sort());
  };

  const grouped = data.permissions.reduce<Record<string, typeof data.permissions>>((acc, entry) => {
    const group = acc[entry.resource] ?? [];
    group.push(entry);
    acc[entry.resource] = group;
    return acc;
  }, {});

  const resources = Object.keys(grouped).sort();

  return (
    <div className="glass-card p-6">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-content-heading">{t.users.permissions.matrix.title}</h2>
        <p className="mt-1 text-sm text-content-secondary">{t.users.permissions.matrix.description}</p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-edge">
              <th className="pb-3 pr-4 text-left font-medium text-content-muted">{t.users.permissions.matrix.columnPermission}</th>
              <th className="pb-3 px-4 text-center font-medium text-content-muted">
                <span className="inline-flex items-center gap-1.5">
                  {t.users.permissions.matrix.columnAdmin}
                  <Lock aria-hidden="true" className="h-3.5 w-3.5 text-content-muted" />
                </span>
              </th>
              <th className="pb-3 pl-4 text-center font-medium text-content-muted">{t.users.permissions.matrix.columnAnalyst}</th>
            </tr>
          </thead>
          <tbody>
            {resources.map((resource) => (
              <Fragment key={resource}>
                <tr>
                  <td colSpan={3} className="pt-4 pb-2">
                    <span className="text-xs font-semibold uppercase tracking-wider text-brand-400">
                      {resource}
                    </span>
                  </td>
                </tr>
                {grouped[resource].map((entry) => (
                  <tr key={entry.permission} className="border-b border-edge-card hover:bg-surface-hover transition-colors">
                    <td className="py-2.5 pr-4 text-content-secondary pl-4">{entry.action}</td>
                    <td className="py-2.5 px-4 text-center">
                      <input
                        type="checkbox"
                        checked
                        readOnly
                        disabled
                        className="h-4 w-4 rounded border-edge bg-surface-hover text-brand-500 cursor-not-allowed opacity-50"
                        aria-label={`${t.users.permissions.matrix.columnAdmin} ${entry.permission}`}
                      />
                    </td>
                    <td className="py-2.5 pl-4 text-center">
                      <input
                        type="checkbox"
                        checked={analystPermissions.has(entry.permission)}
                        disabled={!canWrite || isSaving}
                        onChange={() => handleToggle(entry.permission)}
                        className="h-4 w-4 rounded border-edge bg-surface-hover text-brand-500 focus:ring-brand-500 focus:ring-offset-0 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
                        aria-label={`${t.users.permissions.matrix.columnAnalyst} ${entry.permission}`}
                      />
                    </td>
                  </tr>
                ))}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>

      {canWrite && (
        <div className="mt-6 flex items-center justify-end gap-3">
          {isDirty && (
            <span className="text-sm text-yellow-400">{t.users.permissions.matrix.unsavedChanges}</span>
          )}
          <button
            type="button"
            onClick={handleSave}
            disabled={!isDirty || isSaving}
            className="inline-flex items-center gap-2 rounded-xl bg-brand-500 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Save aria-hidden="true" className="h-4 w-4" />
            {isSaving ? t.users.permissions.matrix.saving : t.users.permissions.matrix.save}
          </button>
        </div>
      )}
    </div>
  );
}
