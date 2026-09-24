import { Fragment, useState, useEffect, type FormEvent } from 'react';
import { ChevronDown, ChevronRight, Shield, UserPlus, Users } from 'lucide-react';
import { useAuth } from '../../auth';
import { CreateUserError, DeleteUserError, UpdatePermissionsError, UpdateUserError } from '../api';
import { USER_ROLE_OPTIONS } from '../contract';
import { useCreateUserMutation } from '../hooks/useCreateUserMutation';
import { useDeleteUserMutation } from '../hooks/useDeleteUserMutation';
import { usePermissionsQuery } from '../hooks/usePermissionsQuery';
import { useUpdateRoleMutation } from '../hooks/useUpdateRoleMutation';
import { useUpdateUserMutation } from '../hooks/useUpdateUserMutation';
import { useUsersQuery } from '../hooks/useUsersQuery';
import { PermissionMatrix } from '../components/PermissionMatrix';
import { useTranslation } from '../../../shared/i18n/translations';
import { useDateFormat } from '../../../shared/contexts/DateFormatContext';
import type { RoleName, UpdateUserPayload, UserResponse, UserRole } from '../types';

const ROLE_BADGE: Record<string, string> = {
  admin: 'border-brand-400/30 bg-brand-500/10 text-brand-300',
  analyst: 'border-cyan-400/30 bg-cyan-500/10 text-cyan-300',
};

export function UsersPage() {
  const t = useTranslation();
  const { formatDate } = useDateFormat();
  const { claims, hasPermission } = useAuth();
  const { data: users = [], isLoading: isLoadingUsers, error: listError } = useUsersQuery();
  const createUserMutation = useCreateUserMutation();
  const updateUserMutation = useUpdateUserMutation();
  const deleteUserMutation = useDeleteUserMutation();
  const canCreateUsers = hasPermission('users', 'write');
  const canEditUsers = canCreateUsers;
  const canDeleteUsers = hasPermission('users', 'delete');
  const canWritePermissions = hasPermission('permissions', 'write');

  const { data: permissionsData, isLoading: isLoadingPermissions, error: permissionsError } = usePermissionsQuery();
  const updateMutation = useUpdateRoleMutation();
  const [permissionsOpen, setPermissionsOpen] = useState(false);
  const [permissionsSuccess, setPermissionsSuccess] = useState<string | null>(null);
  const [permissionsErrorMessage, setPermissionsErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!permissionsSuccess) return;
    const timer = setTimeout(() => setPermissionsSuccess(null), 5000);
    return () => clearTimeout(timer);
  }, [permissionsSuccess]);

  useEffect(() => {
    if (!permissionsErrorMessage) return;
    const timer = setTimeout(() => setPermissionsErrorMessage(null), 8000);
    return () => clearTimeout(timer);
  }, [permissionsErrorMessage]);

  const handleSavePermissions = (role: RoleName, permissions: string[]) => {
    setPermissionsSuccess(null);
    setPermissionsErrorMessage(null);
    updateMutation.mutate(
      { role, payload: { permissions } },
      {
        onSuccess: () => setPermissionsSuccess(t.users.permissions.matrix.saveSuccess),
        onError: (err) =>
          setPermissionsErrorMessage(
            err instanceof UpdatePermissionsError ? err.message : t.users.errors.updateFallback,
          ),
      },
    );
  };

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('analyst');
  const [isActive, setIsActive] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [createdUser, setCreatedUser] = useState<UserResponse | null>(null);
  const [createFormOpen, setCreateFormOpen] = useState(false);
  const [editingUserId, setEditingUserId] = useState<number | null>(null);
  const [editRole, setEditRole] = useState<UserRole>('analyst');
  const [editIsActive, setEditIsActive] = useState(true);
  const [editPassword, setEditPassword] = useState('');
  const [editError, setEditError] = useState<string | null>(null);
  const [editPasswordError, setEditPasswordError] = useState<string | null>(null);
  const [editSuccess, setEditSuccess] = useState<{ userId: number; message: string } | null>(null);
  const [confirmingDeleteUserId, setConfirmingDeleteUserId] = useState<number | null>(null);
  const [deleteError, setDeleteError] = useState<{ userId: number; message: string } | null>(null);
  const [deleteSuccess, setDeleteSuccess] = useState<{ userId: number; message: string } | null>(null);

  const isSubmitting = createUserMutation.isPending;
  const canSubmit = canCreateUsers && username.trim().length > 0 && password.length > 0 && !isSubmitting;

  const validate = () => {
    const newErrors: Record<string, string> = {};
    const trimmed = username.trim();
    if (!trimmed) newErrors.username = t.users.validation.usernameRequired;
    else if (trimmed.length > 100) newErrors.username = t.users.validation.usernameMaxLength;
    if (!password) newErrors.password = t.users.validation.passwordRequired;
    else if (password.length < 8) newErrors.password = t.users.validation.passwordMinLength;
    else if (password.length > 255) newErrors.password = t.users.validation.passwordMaxLength;
    setFieldErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setCreatedUser(null);
    if (!validate()) return;

    try {
      const user = await createUserMutation.mutateAsync({
        username: username.trim(),
        password,
        role,
        is_active: isActive,
      });
      setCreatedUser(user);
      setUsername('');
      setPassword('');
      setRole('analyst');
      setIsActive(true);
      setCreateFormOpen(false);
    } catch (caughtError) {
      setError(caughtError instanceof CreateUserError ? caughtError.message : t.users.errors.createFallback);
    }
  };

  const startEditing = (user: UserResponse) => {
    setCreateFormOpen(false);
    setEditingUserId(user.user_id);
    setEditRole(user.role);
    setEditIsActive(user.is_active);
    setEditPassword('');
    setEditError(null);
    setEditPasswordError(null);
    setEditSuccess(null);
  };

  const cancelEditing = () => {
    setEditingUserId(null);
    setEditPassword('');
    setEditError(null);
    setEditPasswordError(null);
  };

  const handleDeleteUser = async (user: UserResponse) => {
    setDeleteError(null);
    setDeleteSuccess(null);

    try {
      const updatedUser = await deleteUserMutation.mutateAsync(user.user_id);
      setConfirmingDeleteUserId(null);
      setDeleteSuccess({ userId: user.user_id, message: t.users.directory.delete.success(updatedUser.username) });
    } catch (caughtError) {
      setDeleteError({
        userId: user.user_id,
        message: caughtError instanceof DeleteUserError ? caughtError.message : t.users.errors.deleteUserFallback,
      });
    }
  };

  const getEditPayload = (user: UserResponse): UpdateUserPayload => {
    const payload: UpdateUserPayload = {};
    if (editRole !== user.role) payload.role = editRole;
    if (editIsActive !== user.is_active) payload.is_active = editIsActive;
    if (editPassword.length > 0) payload.password = editPassword;
    return payload;
  };

  const validateEditPassword = () => {
    if (editPassword.length === 0) {
      setEditPasswordError(null);
      return true;
    }
    if (editPassword.length < 8) {
      setEditPasswordError(t.users.validation.passwordMinLength);
      return false;
    }
    if (editPassword.length > 255) {
      setEditPasswordError(t.users.validation.passwordMaxLength);
      return false;
    }
    setEditPasswordError(null);
    return true;
  };

  const handleSaveUser = async (user: UserResponse) => {
    setEditError(null);
    setEditSuccess(null);
    if (!validateEditPassword()) return;

    const payload = getEditPayload(user);
    if (Object.keys(payload).length === 0) {
      setEditError(t.users.directory.edit.noChanges);
      return;
    }

    try {
      const updatedUser = await updateUserMutation.mutateAsync({ userId: user.user_id, payload });
      setEditSuccess({ userId: user.user_id, message: t.users.directory.edit.success(updatedUser.username) });
      cancelEditing();
    } catch (caughtError) {
      setEditError(caughtError instanceof UpdateUserError ? caughtError.message : t.users.errors.updateUserFallback);
    }
  };

  const listErrorMessage = listError
    ? (listError instanceof Error ? listError.message : t.users.errors.listFallback)
    : null;

  return (
    <section className="space-y-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-wide text-brand-400">{t.users.eyebrow}</p>
        <h1 className="mt-2 text-3xl font-bold text-content-heading">{t.users.title}</h1>
        <p className="mt-2 max-w-3xl text-content-secondary">{t.users.description}</p>
      </div>

      {!canCreateUsers && (
        <div className="glass-card border-amber-500/20 bg-amber-500/5 p-4 text-sm text-amber-600 dark:text-amber-100" role="note">
          {t.users.authNotice.nonAdmin}
        </div>
      )}

      {createdUser && (
        <div className="glass-card max-w-2xl border-emerald-500/20 bg-emerald-500/5 p-5" role="status">
          <p className="text-sm font-semibold uppercase tracking-wide text-emerald-400">
            {t.users.confirmation.eyebrow}
          </p>
          <h2 className="mt-1 text-lg font-bold text-content-heading">{t.users.confirmation.title}</h2>
          <p className="mt-1 text-content-secondary">
            {t.users.confirmation.detail(createdUser.username, createdUser.role)}
          </p>
        </div>
      )}

      {/* ── User Directory ── */}
      <section className="glass-card overflow-hidden p-6">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-500/10">
              <Users aria-hidden="true" className="h-5 w-5 text-brand-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-content-heading">{t.users.directory.title}</h2>
              <p className="text-sm text-content-secondary">{t.users.directory.description}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {isLoadingUsers && <span className="text-sm text-content-muted animate-pulse">{t.users.directory.loading}</span>}
            {canCreateUsers && (
              <button
                type="button"
                onClick={() => { cancelEditing(); setCreateFormOpen((prev) => !prev); }}
                className="inline-flex items-center gap-2 rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-brand-600"
              >
                <UserPlus aria-hidden="true" className="h-4 w-4" />
                {t.users.form.submitLabel}
              </button>
            )}
          </div>
        </div>

        {listErrorMessage && (
          <div className="mt-4 rounded-xl border border-amber-500/20 bg-amber-500/10 p-4 text-sm text-amber-600 dark:text-amber-100" role="alert">
            {listErrorMessage}
          </div>
        )}

        {/* Inline Create User Form */}
        {createFormOpen && (
          <form className="mt-5 rounded-xl border border-edge-card bg-surface-secondary p-5 space-y-4" onSubmit={handleSubmit}>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-content-secondary" htmlFor="username">
                  {t.users.form.usernameLabel}
                </label>
                <input
                  id="username"
                  name="username"
                  className="mt-1.5 w-full rounded-xl border border-edge-input bg-surface-input px-4 py-2.5 text-content-primary outline-none transition focus:border-brand-500"
                  value={username}
                  onChange={(event) => { setUsername(event.target.value); setFieldErrors((prev) => { const { username: _, ...rest } = prev; return rest; }); }}
                  autoComplete="username"
                />
                {fieldErrors.username && (
                  <p className="mt-1 text-xs text-red-400" role="alert">{fieldErrors.username}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-content-secondary" htmlFor="password">
                  {t.users.form.passwordLabel}
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  className="mt-1.5 w-full rounded-xl border border-edge-input bg-surface-input px-4 py-2.5 text-content-primary outline-none transition focus:border-brand-500"
                  value={password}
                  onChange={(event) => { setPassword(event.target.value); setFieldErrors((prev) => { const { password: _, ...rest } = prev; return rest; }); }}
                  autoComplete="new-password"
                />
                {fieldErrors.password && (
                  <p className="mt-1 text-xs text-red-400" role="alert">{fieldErrors.password}</p>
                )}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3 items-end">
              <div>
                <label className="block text-sm font-medium text-content-secondary" htmlFor="role">
                  {t.users.form.roleLabel}
                </label>
                <select
                  id="role"
                  name="role"
                  className="mt-1.5 w-full rounded-xl border border-edge-input bg-surface-input px-4 py-2.5 text-content-primary outline-none transition focus:border-brand-500"
                  value={role}
                  onChange={(event) => setRole(event.target.value as UserRole)}
                >
                  {USER_ROLE_OPTIONS.map((option) => (
                    <option key={option} value={option} className="bg-surface-primary text-content-primary">
                      {option.charAt(0).toUpperCase() + option.slice(1)}
                    </option>
                  ))}
                </select>
              </div>

              <label className="flex items-center gap-3 text-sm text-content-secondary pb-1">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(event) => setIsActive(event.target.checked)}
                  className="h-4 w-4 rounded border-edge bg-surface-input text-brand-500"
                />
                {t.users.form.activeLabel}
              </label>

              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setCreateFormOpen(false)}
                  className="rounded-xl border border-edge px-4 py-2.5 text-sm font-medium text-content-secondary transition hover:bg-surface-hover"
                >
                  {t.users.form.cancelLabel}
                </button>
                <button
                  type="submit"
                  disabled={!canSubmit}
                  className="rounded-xl bg-brand-500 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isSubmitting ? t.users.form.submittingLabel : t.users.form.submitLabel}
                </button>
              </div>
            </div>

            {error && (
              <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-200" role="alert">
                {error}
              </div>
            )}
          </form>
        )}

        {!isLoadingUsers && !listErrorMessage && users.length === 0 && (
          <p className="mt-4 text-sm text-content-secondary">{t.users.directory.empty}</p>
        )}

        {users.length > 0 && (
          <div className="mt-5 overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-edge text-left text-content-muted">
                  <th className="py-3 pr-4 font-medium">{t.users.directory.columns.username}</th>
                  <th className="px-4 py-3 font-medium">{t.users.directory.columns.role}</th>
                  <th className="px-4 py-3 font-medium">{t.users.directory.columns.status}</th>
                  <th className="pl-4 py-3 font-medium">{t.users.directory.columns.createdAt}</th>
                  {(canEditUsers || canDeleteUsers) && <th className="pl-4 py-3 font-medium">{t.users.directory.columns.actions}</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-edge-card">
                {users.map((user) => {
                  const roleBadge = ROLE_BADGE[user.role] ?? ROLE_BADGE.analyst;
                  const isEditing = editingUserId === user.user_id;
                  const editPayload = isEditing ? getEditPayload(user) : {};
                  const hasEditChanges = Object.keys(editPayload).length > 0;
                  const isSavingThisUser = updateUserMutation.isPending && isEditing;
                  const isConfirmingDelete = confirmingDeleteUserId === user.user_id;
                  const isDeletingThisUser = deleteUserMutation.isPending && isConfirmingDelete;
                  const isCurrentUser = claims.user_id !== undefined && claims.user_id === user.user_id;
                  return (
                    <Fragment key={user.user_id}>
                      <tr className="transition-colors hover:bg-surface-hover">
                        <td className="py-3.5 pr-4">
                          <span className="font-medium text-content-heading">{user.username}</span>
                        </td>
                        <td className="px-4 py-3.5">
                          <span className={`inline-block rounded-full border px-3 py-0.5 text-xs font-semibold capitalize ${roleBadge}`}>
                            {user.role}
                          </span>
                        </td>
                        <td className="px-4 py-3.5">
                          <span className="inline-flex items-center gap-1.5">
                            <span className={`inline-block h-2 w-2 rounded-full ${user.is_active ? 'bg-emerald-400' : 'bg-red-400'}`} />
                            <span className={user.is_active ? 'text-emerald-400' : 'text-red-400'}>
                              {user.is_active ? t.users.directory.active : t.users.directory.inactive}
                            </span>
                          </span>
                        </td>
                        <td className="pl-4 py-3.5 text-content-muted">{formatDate(user.created_at)}</td>
                        {(canEditUsers || canDeleteUsers) && (
                          <td className="pl-4 py-3.5">
                            <div className="flex flex-wrap gap-2">
                              {canEditUsers && (
                                <button
                                  type="button"
                                  onClick={() => startEditing(user)}
                                  disabled={updateUserMutation.isPending || deleteUserMutation.isPending}
                                  className="rounded-lg border border-edge px-3 py-1.5 text-xs font-medium text-content-secondary transition hover:bg-surface-hover disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                  {t.users.directory.edit.button}
                                </button>
                              )}
                              {canDeleteUsers && !user.is_active && (
                                <button
                                  type="button"
                                  disabled
                                  className="rounded-lg border border-edge px-3 py-1.5 text-xs font-medium text-content-muted opacity-60"
                                >
                                  {t.users.directory.delete.inactive}
                                </button>
                              )}
                              {canDeleteUsers && user.is_active && isCurrentUser && (
                                <button
                                  type="button"
                                  disabled
                                  className="rounded-lg border border-edge px-3 py-1.5 text-xs font-medium text-content-muted opacity-60"
                                >
                                  {t.users.directory.delete.self}
                                </button>
                              )}
                              {canDeleteUsers && user.is_active && !isCurrentUser && (
                                <button
                                  type="button"
                                  onClick={() => { cancelEditing(); setDeleteError(null); setDeleteSuccess(null); setConfirmingDeleteUserId(user.user_id); }}
                                  disabled={deleteUserMutation.isPending}
                                  className="rounded-lg border border-red-500/30 px-3 py-1.5 text-xs font-medium text-red-300 transition hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                  {t.users.directory.delete.button}
                                </button>
                              )}
                            </div>
                          </td>
                        )}
                      </tr>
                      {(canEditUsers || canDeleteUsers) && deleteSuccess?.userId === user.user_id && !isConfirmingDelete && (
                        <tr>
                          <td colSpan={5} className="px-4 pb-3 text-sm text-emerald-400" role="status">
                            {deleteSuccess.message}
                          </td>
                        </tr>
                      )}
                      {canEditUsers && editSuccess?.userId === user.user_id && !isEditing && (
                        <tr>
                          <td colSpan={5} className="px-4 pb-3 text-sm text-emerald-400" role="status">
                            {editSuccess.message}
                          </td>
                        </tr>
                      )}
                      {canDeleteUsers && isConfirmingDelete && (
                        <tr className="bg-surface-secondary/60">
                          <td colSpan={5} className="p-4">
                            <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4">
                              <p className="text-sm font-semibold text-content-heading">
                                {t.users.directory.delete.confirming(user.username)}
                              </p>
                              <div className="mt-3 flex flex-wrap gap-2">
                                <button
                                  type="button"
                                  onClick={() => { setConfirmingDeleteUserId(null); setDeleteError(null); }}
                                  disabled={isDeletingThisUser}
                                  className="rounded-xl border border-edge px-4 py-2 text-sm font-medium text-content-secondary transition hover:bg-surface-hover disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                  {t.users.directory.delete.cancel}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteUser(user)}
                                  disabled={isDeletingThisUser}
                                  className="rounded-xl bg-red-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                  {isDeletingThisUser ? t.users.directory.delete.deleting : t.users.directory.delete.confirm}
                                </button>
                              </div>
                              {deleteError?.userId === user.user_id && (
                                <div className="mt-3 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-300" role="alert">
                                  {deleteError.message}
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                      {canEditUsers && isEditing && (
                        <tr className="bg-surface-secondary/60">
                          <td colSpan={5} className="p-4">
                            <div className="rounded-xl border border-edge-card bg-surface-secondary p-4">
                              <h3 className="text-sm font-semibold text-content-heading">{t.users.directory.edit.title(user.username)}</h3>
                              <div className="mt-4 grid gap-4 md:grid-cols-4 md:items-end">
                                <div>
                                  <label className="block text-xs font-medium text-content-secondary" htmlFor={`edit-role-${user.user_id}`}>
                                    {t.users.form.roleLabel}
                                  </label>
                                  <select
                                    id={`edit-role-${user.user_id}`}
                                    className="mt-1.5 w-full rounded-xl border border-edge-input bg-surface-input px-3 py-2 text-content-primary outline-none transition focus:border-brand-500"
                                    value={editRole}
                                    onChange={(event) => setEditRole(event.target.value as UserRole)}
                                    disabled={isSavingThisUser}
                                  >
                                    {USER_ROLE_OPTIONS.map((option) => (
                                      <option key={option} value={option} className="bg-surface-primary text-content-primary">
                                        {option.charAt(0).toUpperCase() + option.slice(1)}
                                      </option>
                                    ))}
                                  </select>
                                </div>

                                <label className="flex items-center gap-3 pb-2 text-sm text-content-secondary">
                                  <input
                                    type="checkbox"
                                    checked={editIsActive}
                                    onChange={(event) => setEditIsActive(event.target.checked)}
                                    disabled={isSavingThisUser}
                                    className="h-4 w-4 rounded border-edge bg-surface-input text-brand-500"
                                  />
                                  {t.users.form.activeLabel}
                                </label>

                                <div>
                                  <label className="block text-xs font-medium text-content-secondary" htmlFor={`edit-password-${user.user_id}`}>
                                    {t.users.directory.edit.passwordLabel}
                                  </label>
                                  <input
                                    id={`edit-password-${user.user_id}`}
                                    type="password"
                                    className="mt-1.5 w-full rounded-xl border border-edge-input bg-surface-input px-3 py-2 text-content-primary outline-none transition focus:border-brand-500"
                                    value={editPassword}
                                    onChange={(event) => { setEditPassword(event.target.value); setEditPasswordError(null); setEditError(null); }}
                                    placeholder={t.users.directory.edit.passwordPlaceholder}
                                    autoComplete="new-password"
                                    disabled={isSavingThisUser}
                                  />
                                  {editPasswordError && <p className="mt-1 text-xs text-red-400" role="alert">{editPasswordError}</p>}
                                </div>

                                <div className="flex gap-2 md:justify-end">
                                  <button
                                    type="button"
                                    onClick={cancelEditing}
                                    disabled={isSavingThisUser}
                                    className="rounded-xl border border-edge px-4 py-2 text-sm font-medium text-content-secondary transition hover:bg-surface-hover disabled:cursor-not-allowed disabled:opacity-50"
                                  >
                                    {t.users.directory.edit.cancel}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleSaveUser(user)}
                                    disabled={!hasEditChanges || isSavingThisUser}
                                    className="rounded-xl bg-brand-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-50"
                                  >
                                    {isSavingThisUser ? t.users.directory.edit.saving : t.users.directory.edit.save}
                                  </button>
                                </div>
                              </div>

                              {!hasEditChanges && !editError && (
                                <p className="mt-3 text-xs text-content-muted">{t.users.directory.edit.noChanges}</p>
                              )}
                              {editError && (
                                <div className="mt-3 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-300" role="alert">
                                  {editError}
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ── Role Permissions ── */}
      <section className="glass-card overflow-hidden">
        <button
          type="button"
          onClick={() => setPermissionsOpen((prev) => !prev)}
          className="flex w-full items-center justify-between gap-4 p-6 text-left transition hover:bg-surface-hover"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10">
              <Shield aria-hidden="true" className="h-5 w-5 text-amber-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-content-heading">{t.users.permissions.sectionTitle}</h2>
              <p className="text-sm text-content-secondary">{t.users.permissions.matrix.description}</p>
            </div>
          </div>
          {permissionsOpen ? (
            <ChevronDown aria-hidden="true" className="h-5 w-5 text-content-muted shrink-0" />
          ) : (
            <ChevronRight aria-hidden="true" className="h-5 w-5 text-content-muted shrink-0" />
          )}
        </button>

        {permissionsOpen && (
          <div className="border-t border-edge px-6 pb-6 pt-4 space-y-4">
            {permissionsError && (
              <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4 text-sm text-red-300" role="alert">
                {permissionsError instanceof Error ? permissionsError.message : t.users.errors.fetchFallback}
              </div>
            )}

            {permissionsSuccess && (
              <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 text-sm text-emerald-300" role="status">
                {permissionsSuccess}
              </div>
            )}

            {permissionsErrorMessage && (
              <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4 text-sm text-red-300" role="alert">
                {permissionsErrorMessage}
              </div>
            )}

            {isLoadingPermissions ? (
              <div className="flex h-48 items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500/30 border-t-brand-500" />
              </div>
            ) : permissionsData ? (
              <PermissionMatrix
                data={permissionsData}
                canWrite={canWritePermissions}
                onSave={handleSavePermissions}
                isSaving={updateMutation.isPending}
              />
            ) : null}
          </div>
        )}
      </section>
    </section>
  );
}
