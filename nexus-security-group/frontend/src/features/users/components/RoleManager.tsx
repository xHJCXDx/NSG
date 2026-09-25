import { useState, useEffect, type FormEvent } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { useCreateRoleMutation } from '../hooks/useCreateRoleMutation';
import { useDeleteRoleMutation } from '../hooks/useDeleteRoleMutation';
import { RolesError } from '../api';
import { useTranslation } from '../../../shared/i18n/translations';
import type { Role } from '../types';

interface RoleManagerProps {
  roles: Role[];
  canWrite: boolean;
}

export function RoleManager({ roles, canWrite }: RoleManagerProps) {
  const t = useTranslation();
  const createMutation = useCreateRoleMutation();
  const deleteMutation = useDeleteRoleMutation();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<number | null>(null);

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

  const handleCreate = (event: FormEvent) => {
    event.preventDefault();
    if (!name.trim()) return;

    setSuccessMessage(null);
    setErrorMessage(null);
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

  const handleDelete = (role: Role) => {
    setSuccessMessage(null);
    setErrorMessage(null);
    deleteMutation.mutate(role.role_id, {
      onSuccess: () => {
        setSuccessMessage(t.users.roles.deleteSuccess(role.name));
        setConfirmingDeleteId(null);
      },
      onError: (err) => {
        setErrorMessage(err instanceof RolesError ? err.message : t.users.roles.deleteError);
        setConfirmingDeleteId(null);
      },
    });
  };

  const customRoles = roles.filter((r) => !r.is_system);
  const systemRoles = roles.filter((r) => r.is_system);

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

      {/* Custom roles */}
      {customRoles.length === 0 ? (
        <p className="text-sm text-content-muted">{t.users.roles.noCustomRoles}</p>
      ) : (
        <div className="space-y-2">
          {customRoles.map((role) => (
            <div key={role.role_id} className="flex items-center justify-between rounded-xl border border-edge-card p-4 transition hover:bg-surface-hover">
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
                <div className="flex items-center gap-2">
                  {confirmingDeleteId === role.role_id ? (
                    <>
                      <span className="text-xs text-content-muted">
                        {t.users.roles.deleteConfirm(role.name)}
                      </span>
                      <button
                        type="button"
                        onClick={() => setConfirmingDeleteId(null)}
                        disabled={deleteMutation.isPending}
                        className="rounded-lg border border-edge px-3 py-1.5 text-xs font-medium text-content-secondary transition hover:bg-surface-hover disabled:opacity-50"
                      >
                        {t.users.roles.cancel}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(role)}
                        disabled={deleteMutation.isPending}
                        className="rounded-lg bg-red-500 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-red-600 disabled:opacity-50"
                      >
                        {deleteMutation.isPending ? t.users.roles.deleting : t.users.roles.deleteButton}
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmingDeleteId(role.role_id)}
                      className="rounded-lg border border-red-500/30 p-2 text-red-300 transition hover:bg-red-500/10"
                    >
                      <Trash2 aria-hidden="true" className="h-4 w-4" />
                    </button>
                  )}
                </div>
              )}
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
