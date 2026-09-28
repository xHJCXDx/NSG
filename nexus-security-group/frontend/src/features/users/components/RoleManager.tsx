import { useState, useEffect, type FormEvent } from 'react';
import { Plus, Trash2, RotateCcw } from 'lucide-react';
import { useCreateRoleMutation } from '../hooks/useCreateRoleMutation';
import { useDeleteRoleMutation } from '../hooks/useDeleteRoleMutation';
import { useReactivateRoleMutation } from '../hooks/useReactivateRoleMutation';
import { usePermanentlyDeleteRoleMutation } from '../hooks/usePermanentlyDeleteRoleMutation';
import { RolesError } from '../api';
import { useTranslation } from '../../../shared/i18n/translations';
import type { Role } from '../types';

interface RoleManagerProps {
  roles: Role[];
  canWrite: boolean;
}

type ConfirmAction = { roleId: number; type: 'deactivate' | 'reactivate' | 'permanent' };

export function RoleManager({ roles, canWrite }: RoleManagerProps) {
  const t = useTranslation();
  const createMutation = useCreateRoleMutation();
  const deactivateMutation = useDeleteRoleMutation();
  const reactivateMutation = useReactivateRoleMutation();
  const permanentDeleteMutation = usePermanentlyDeleteRoleMutation();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<ConfirmAction | null>(null);

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

  const clearMessages = () => {
    setSuccessMessage(null);
    setErrorMessage(null);
  };

  const handleCreate = (event: FormEvent) => {
    event.preventDefault();
    if (!name.trim()) return;

    clearMessages();
    createMutation.mutate(
      { name: name.trim(), description: description.trim() || undefined },
      {
        onSuccess: (role) => {
          setSuccessMessage(t.users.roles.createSuccess(role.name));
          setName('');
          setDescription('');
        },
        onError: (err) => {
          setErrorMessage(err instanceof RolesError ? err.message : t.users.roles.createError);
        },
      },
    );
  };

  const handleDeactivate = (role: Role) => {
    clearMessages();
    deactivateMutation.mutate(role.role_id, {
      onSuccess: () => {
        setSuccessMessage(t.users.roles.deactivateSuccess(role.name));
        setConfirming(null);
      },
      onError: (err) => {
        setErrorMessage(err instanceof RolesError ? err.message : t.users.roles.deactivateError);
        setConfirming(null);
      },
    });
  };

  const handleReactivate = (role: Role) => {
    clearMessages();
    reactivateMutation.mutate(role.role_id, {
      onSuccess: () => {
        setSuccessMessage(t.users.roles.reactivateSuccess(role.name));
        setConfirming(null);
      },
      onError: (err) => {
        setErrorMessage(err instanceof RolesError ? err.message : t.users.roles.reactivateError);
        setConfirming(null);
      },
    });
  };

  const handlePermanentDelete = (role: Role) => {
    clearMessages();
    permanentDeleteMutation.mutate(role.role_id, {
      onSuccess: () => {
        setSuccessMessage(t.users.roles.permanentDeleteSuccess(role.name));
        setConfirming(null);
      },
      onError: (err) => {
        setErrorMessage(err instanceof RolesError ? err.message : t.users.roles.permanentDeleteError);
        setConfirming(null);
      },
    });
  };

  const isMutating = deactivateMutation.isPending || reactivateMutation.isPending || permanentDeleteMutation.isPending;

  const systemRoles = roles.filter((r) => r.is_system);
  const activeCustomRoles = roles.filter((r) => !r.is_system && r.is_active);
  const inactiveCustomRoles = roles.filter((r) => !r.is_system && !r.is_active);

  const renderConfirmBar = (role: Role, action: ConfirmAction['type']) => {
    if (!confirming || confirming.roleId !== role.role_id || confirming.type !== action) return null;

    const config = {
      deactivate: {
        message: t.users.roles.deactivateConfirm(role.name),
        confirmLabel: t.users.roles.deactivateButton,
        loadingLabel: t.users.roles.deactivating,
        isPending: deactivateMutation.isPending,
        onConfirm: () => handleDeactivate(role),
        btnClass: 'bg-red-500 hover:bg-red-600',
      },
      reactivate: {
        message: t.users.roles.reactivateConfirm(role.name),
        confirmLabel: t.users.roles.reactivateButton,
        loadingLabel: t.users.roles.reactivating,
        isPending: reactivateMutation.isPending,
        onConfirm: () => handleReactivate(role),
        btnClass: 'bg-emerald-500 hover:bg-emerald-600',
      },
      permanent: {
        message: t.users.roles.permanentDeleteConfirm(role.name),
        confirmLabel: t.users.roles.permanentDeleteButton,
        loadingLabel: t.users.roles.permanentDeleting,
        isPending: permanentDeleteMutation.isPending,
        onConfirm: () => handlePermanentDelete(role),
        btnClass: 'bg-red-600 hover:bg-red-700',
      },
    }[action];

    return (
      <div className="mt-2 flex items-center gap-2 flex-wrap">
        <span className="text-xs text-content-muted">{config.message}</span>
        <button
          type="button"
          onClick={() => setConfirming(null)}
          disabled={config.isPending}
          className="rounded-lg border border-edge px-3 py-1.5 text-xs font-medium text-content-secondary transition hover:bg-surface-hover disabled:opacity-50"
        >
          {t.users.roles.cancel}
        </button>
        <button
          type="button"
          onClick={config.onConfirm}
          disabled={config.isPending}
          className={`rounded-lg px-3 py-1.5 text-xs font-medium text-white transition disabled:opacity-50 ${config.btnClass}`}
        >
          {config.isPending ? config.loadingLabel : config.confirmLabel}
        </button>
      </div>
    );
  };

  return (
    <div className="space-y-5">
      {successMessage && (
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 text-sm text-emerald-300" role="status">
          {successMessage}
        </div>
      )}

      {errorMessage && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4 text-sm text-red-300" role="alert">
          {errorMessage}
        </div>
      )}

      {/* System roles */}
      <div className="space-y-2">
        {systemRoles.map((role) => (
          <div key={role.role_id} className="flex items-center justify-between rounded-xl border border-edge-card bg-surface-secondary p-4">
            <div>
              <span className="font-medium capitalize text-content-heading">{role.name}</span>
              {role.description && (
                <p className="mt-0.5 text-sm text-content-muted">{role.description}</p>
              )}
            </div>
            <span className="rounded-full border border-brand-400/30 bg-brand-500/10 px-3 py-0.5 text-xs font-semibold text-brand-300">
              {t.users.roles.systemBadge}
            </span>
          </div>
        ))}
      </div>

      {/* Active custom roles */}
      {activeCustomRoles.length === 0 && inactiveCustomRoles.length === 0 ? (
        <p className="text-sm text-content-muted">{t.users.roles.noCustomRoles}</p>
      ) : (
        <div className="space-y-2">
          {activeCustomRoles.map((role) => (
            <div key={role.role_id} className="rounded-xl border border-edge-card p-4 transition hover:bg-surface-hover">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium capitalize text-content-heading">{role.name}</span>
                    <span className="rounded-full border border-cyan-400/30 bg-cyan-500/10 px-3 py-0.5 text-xs font-semibold text-cyan-300">
                      {t.users.roles.customBadge}
                    </span>
                  </div>
                  {role.description && (
                    <p className="mt-0.5 text-sm text-content-muted">{role.description}</p>
                  )}
                </div>
                {canWrite && (
                  <button
                    type="button"
                    onClick={() => setConfirming({ roleId: role.role_id, type: 'deactivate' })}
                    disabled={isMutating}
                    className="rounded-lg border border-red-500/30 p-2 text-red-300 transition hover:bg-red-500/10 disabled:opacity-50"
                  >
                    <Trash2 aria-hidden="true" className="h-4 w-4" />
                  </button>
                )}
              </div>
              {renderConfirmBar(role, 'deactivate')}
            </div>
          ))}
        </div>
      )}

      {/* Inactive custom roles */}
      {inactiveCustomRoles.length > 0 && (
        <div className="space-y-2">
          {inactiveCustomRoles.map((role) => (
            <div key={role.role_id} className="rounded-xl border border-edge-card bg-surface-secondary/50 p-4 opacity-75">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium capitalize text-content-heading line-through">{role.name}</span>
                    <span className="rounded-full border border-zinc-400/30 bg-zinc-500/10 px-3 py-0.5 text-xs font-semibold text-zinc-400">
                      {t.users.roles.inactiveBadge}
                    </span>
                  </div>
                  {role.description && (
                    <p className="mt-0.5 text-sm text-content-muted">{role.description}</p>
                  )}
                </div>
                {canWrite && (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setConfirming({ roleId: role.role_id, type: 'reactivate' })}
                      disabled={isMutating}
                      className="rounded-lg border border-emerald-500/30 p-2 text-emerald-300 transition hover:bg-emerald-500/10 disabled:opacity-50"
                    >
                      <RotateCcw aria-hidden="true" className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirming({ roleId: role.role_id, type: 'permanent' })}
                      disabled={isMutating}
                      className="rounded-lg border border-red-500/30 p-2 text-red-300 transition hover:bg-red-500/10 disabled:opacity-50"
                    >
                      <Trash2 aria-hidden="true" className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>
              {renderConfirmBar(role, 'reactivate')}
              {renderConfirmBar(role, 'permanent')}
            </div>
          ))}
        </div>
      )}

      {/* Create form */}
      {canWrite && (
        <form onSubmit={handleCreate} className="rounded-xl border border-edge-card bg-surface-secondary p-4 space-y-3">
          <h3 className="text-sm font-semibold text-content-heading">{t.users.roles.createTitle}</h3>
          <div className="grid gap-3 sm:grid-cols-3 sm:items-end">
            <div>
              <label className="block text-xs font-medium text-content-secondary" htmlFor="role-name">
                {t.users.roles.nameLabel}
              </label>
              <input
                id="role-name"
                className="mt-1 w-full rounded-xl border border-edge-input bg-surface-input px-3 py-2 text-sm text-content-primary outline-none transition focus:border-brand-500"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t.users.roles.namePlaceholder}
                disabled={createMutation.isPending}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-content-secondary" htmlFor="role-description">
                {t.users.roles.descriptionLabel}
              </label>
              <input
                id="role-description"
                className="mt-1 w-full rounded-xl border border-edge-input bg-surface-input px-3 py-2 text-sm text-content-primary outline-none transition focus:border-brand-500"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={t.users.roles.descriptionPlaceholder}
                disabled={createMutation.isPending}
              />
            </div>
            <button
              type="submit"
              disabled={!name.trim() || createMutation.isPending}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Plus aria-hidden="true" className="h-4 w-4" />
              {createMutation.isPending ? t.users.roles.creating : t.users.roles.createButton}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
