import { useState, useEffect } from 'react';
import { ChevronDown, ChevronRight, Lock, Save } from 'lucide-react';
import type { PermissionMatrixResponse, Role } from '../types';
import { useTranslation } from '../../../shared/i18n/translations';

interface PermissionMatrixProps {
  data: PermissionMatrixResponse;
  roles: Role[];
  canWrite: boolean;
  onSave: (roleId: number, roleName: string, permissions: string[]) => void;
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
        disabled ? 'cursor-not-allowed opacity-40' : 'cursor-pointer'
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

export function PermissionMatrix({ data, roles, canWrite, onSave, isSaving }: PermissionMatrixProps) {
  const t = useTranslation();
  const resourceLabels = t.users.permissions.matrix.resources;
  const actionLabels = t.users.permissions.matrix.actions;

  const editableRoles = roles.filter((r) => r.name !== 'admin');
  const roleNames = roles.map((r) => r.name);

  const [editedPermissions, setEditedPermissions] = useState<Record<string, Set<string>>>(() => {
    const state: Record<string, Set<string>> = {};
    for (const role of editableRoles) {
      state[role.name] = new Set(data.role_permissions[role.name] ?? []);
    }
    return state;
  });

  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

  useEffect(() => {
    const state: Record<string, Set<string>> = {};
    for (const role of editableRoles) {
      state[role.name] = new Set(data.role_permissions[role.name] ?? []);
    }
    setEditedPermissions(state);
  }, [data, roles]);

  const dirtyRoles = editableRoles.filter((role) => {
    const original = new Set(data.role_permissions[role.name] ?? []);
    const edited = editedPermissions[role.name];
    if (!edited) return false;
    return edited.size !== original.size || [...edited].some((p) => !original.has(p));
  });

  const isDirty = dirtyRoles.length > 0;

  const handleToggle = (roleName: string, permission: string) => {
    setEditedPermissions((prev) => {
      const current = new Set(prev[roleName] ?? []);
      if (current.has(permission)) {
        current.delete(permission);
      } else {
        current.add(permission);
      }
      return { ...prev, [roleName]: current };
    });
  };

  const handleSave = () => {
    for (const role of dirtyRoles) {
      const perms = editedPermissions[role.name];
      if (perms) {
        onSave(role.role_id, role.name, [...perms].sort());
      }
    }
  };

  const toggleGroup = (resource: string) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(resource)) {
        next.delete(resource);
      } else {
        next.add(resource);
      }
      return next;
    });
  };

  const toggleAllForResource = (roleName: string, entries: typeof data.permissions) => {
    setEditedPermissions((prev) => {
      const current = new Set(prev[roleName] ?? []);
      const allChecked = entries.every((e) => current.has(e.permission));
      for (const entry of entries) {
        if (allChecked) {
          current.delete(entry.permission);
        } else {
          current.add(entry.permission);
        }
      }
      return { ...prev, [roleName]: current };
    });
  };

  const grouped = data.permissions.reduce<Record<string, typeof data.permissions>>((acc, entry) => {
    const group = acc[entry.resource] ?? [];
    group.push(entry);
    acc[entry.resource] = group;
    return acc;
  }, {});

  const resources = Object.keys(grouped).sort();

  const getResourceLabel = (resource: string) =>
    (resourceLabels as Record<string, string>)[resource] ?? resource.charAt(0).toUpperCase() + resource.slice(1);

  const getActionLabel = (action: string) =>
    (actionLabels as Record<string, string>)[action] ?? action.charAt(0).toUpperCase() + action.slice(1);

  const getResourceDirtyCount = (resource: string) => {
    const entries = grouped[resource];
    let count = 0;
    for (const entry of entries) {
      const hasChange = editableRoles.some((role) => {
        const original = new Set(data.role_permissions[role.name] ?? []);
        const edited = editedPermissions[role.name];
        if (!edited) return false;
        return edited.has(entry.permission) !== original.has(entry.permission);
      });
      if (hasChange) count++;
    }
    return count;
  };

  return (
    <div className="space-y-5">
      {/* Role column headers */}
      <div className="flex items-center gap-3 px-2">
        <div className="flex-1" />
        {roleNames.map((name) => (
          <div key={name} className="w-24 text-center">
            <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-content-heading capitalize">
              {name}
              {name === 'admin' && <Lock aria-hidden="true" className="h-3.5 w-3.5 text-amber-400" />}
            </span>
          </div>
        ))}
      </div>

      {/* Resource groups */}
      <div className="space-y-2">
        {resources.map((resource) => {
          const entries = grouped[resource];
          const isCollapsed = collapsedGroups.has(resource);
          const dirtyCount = getResourceDirtyCount(resource);

          return (
            <div key={resource} className="rounded-xl border border-edge-card overflow-hidden">
              {/* Group header */}
              <button
                type="button"
                onClick={() => toggleGroup(resource)}
                className="w-full flex items-center justify-between px-5 py-3 bg-surface-secondary hover:bg-surface-hover transition-colors"
              >
                <div className="flex items-center gap-3">
                  {isCollapsed
                    ? <ChevronRight className="h-4 w-4 text-content-muted" />
                    : <ChevronDown className="h-4 w-4 text-content-muted" />
                  }
                  <span className="text-sm font-bold text-content-heading">
                    {getResourceLabel(resource)}
                  </span>
                  <span className="text-xs text-content-muted">
                    ({entries.length})
                  </span>
                  {dirtyCount > 0 && (
                    <span className="inline-flex items-center gap-1 text-xs text-amber-400">
                      <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
                      {dirtyCount}
                    </span>
                  )}
                </div>
                {/* Quick toggle all per role */}
                {!isCollapsed && canWrite && (
                  <div className="flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
                    {roleNames.map((roleName) => {
                      const isAdmin = roleName === 'admin';
                      if (isAdmin) return <div key={roleName} className="w-24" />;
                      const allChecked = entries.every((e) => editedPermissions[roleName]?.has(e.permission));
                      return (
                        <div key={roleName} className="w-24 text-center">
                          <button
                            type="button"
                            onClick={() => toggleAllForResource(roleName, entries)}
                            disabled={isSaving}
                            className={`text-xs font-medium px-2 py-0.5 rounded-md transition ${
                              allChecked
                                ? 'text-brand-400 bg-brand-500/10 hover:bg-brand-500/20'
                                : 'text-content-muted hover:bg-surface-hover'
                            }`}
                          >
                            {allChecked ? t.users.permissions.matrix.allOn : t.users.permissions.matrix.allOff}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </button>

              {/* Permission rows */}
              {!isCollapsed && (
                <div className="divide-y divide-edge-card">
                  {entries.map((entry) => {
                    const hasChanges = editableRoles.some((role) => {
                      const original = new Set(data.role_permissions[role.name] ?? []);
                      const edited = editedPermissions[role.name];
                      if (!edited) return false;
                      return edited.has(entry.permission) !== original.has(entry.permission);
                    });

                    const descKey = entry.permission.replace(':', '_') as keyof typeof t.users.permissions.matrix.descriptions;
                    const description = t.users.permissions.matrix.descriptions[descKey];

                    return (
                      <div
                        key={entry.permission}
                        className={`flex items-center gap-3 px-5 py-3 transition-colors ${
                          hasChanges ? 'bg-amber-500/5' : 'hover:bg-surface-hover'
                        }`}
                      >
                        <div className="flex-1 pl-7">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-content-secondary">
                              {getActionLabel(entry.action)}
                            </span>
                            {hasChanges && (
                              <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-400" />
                            )}
                          </div>
                          {description && (
                            <p className="text-xs text-content-muted mt-0.5">{description}</p>
                          )}
                        </div>
                        {roleNames.map((roleName) => {
                          const isAdmin = roleName === 'admin';
                          const checked = isAdmin
                            ? (data.role_permissions.admin ?? []).includes(entry.permission)
                            : (editedPermissions[roleName]?.has(entry.permission) ?? false);
                          return (
                            <div key={roleName} className="w-24 flex justify-center">
                              <Toggle
                                checked={checked}
                                disabled={isAdmin || !canWrite || isSaving}
                                onChange={() => handleToggle(roleName, entry.permission)}
                                label={`${roleName} ${entry.permission}`}
                              />
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Save bar */}
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
