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

function Toggle({ checked, disabled, onChange, label }: { checked: boolean; disabled: boolean; onChange: () => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={onChange}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 focus:ring-offset-surface-primary ${
        disabled
          ? 'cursor-not-allowed opacity-40'
          : 'cursor-pointer'
      } ${checked ? 'bg-brand-500' : 'bg-surface-hover border-edge'}`}
    >
      <span
        className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${
          checked ? 'translate-x-5' : 'translate-x-0.5'
        }`}
      />
    </button>
  );
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
    <div className="space-y-5">
      <div className="overflow-x-auto rounded-xl border border-edge-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-surface-secondary">
              <th className="py-3 px-5 text-left font-medium text-content-muted">{t.users.permissions.matrix.columnPermission}</th>
              <th className="py-3 px-5 text-center font-medium text-content-muted">
                <span className="inline-flex items-center gap-1.5">
                  {t.users.permissions.matrix.columnAdmin}
                  <Lock aria-hidden="true" className="h-3.5 w-3.5" />
                </span>
              </th>
              <th className="py-3 px-5 text-center font-medium text-content-muted">{t.users.permissions.matrix.columnAnalyst}</th>
            </tr>
          </thead>
          <tbody>
            {resources.map((resource) => (
              <Fragment key={resource}>
                <tr>
                  <td colSpan={3} className="pt-4 pb-2 px-5">
                    <span className="text-xs font-bold uppercase tracking-wider text-brand-400">
                      {resource}
                    </span>
                  </td>
                </tr>
                {grouped[resource].map((entry) => {
                  const isChanged = analystPermissions.has(entry.permission) !== originalSet.has(entry.permission);
                  return (
                    <tr
                      key={entry.permission}
                      className={`border-b border-edge-card transition-colors ${
                        isChanged ? 'bg-amber-500/5' : 'hover:bg-surface-hover'
                      }`}
                    >
                      <td className="py-3 px-5 pl-8 text-content-secondary">
                        <span className="capitalize">{entry.action}</span>
                        {isChanged && (
                          <span className="ml-2 inline-block h-1.5 w-1.5 rounded-full bg-amber-400" />
                        )}
                      </td>
                      <td className="py-3 px-5 text-center">
                        <Toggle
                          checked
                          disabled
                          onChange={() => {}}
                          label={`${t.users.permissions.matrix.columnAdmin} ${entry.permission}`}
                        />
                      </td>
                      <td className="py-3 px-5 text-center">
                        <Toggle
                          checked={analystPermissions.has(entry.permission)}
                          disabled={!canWrite || isSaving}
                          onChange={() => handleToggle(entry.permission)}
                          label={`${t.users.permissions.matrix.columnAnalyst} ${entry.permission}`}
                        />
                      </td>
                    </tr>
                  );
                })}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>

      {canWrite && (
        <div className="flex items-center justify-end gap-3">
          {isDirty && (
            <span className="flex items-center gap-1.5 text-sm text-amber-400">
              <span className="inline-block h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
              {t.users.permissions.matrix.unsavedChanges}
            </span>
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
