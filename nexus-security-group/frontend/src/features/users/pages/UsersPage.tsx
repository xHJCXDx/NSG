import { useState, useEffect, type FormEvent } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { useAuth } from '../../auth';
import { CreateUserError, UpdatePermissionsError } from '../api';
import { USER_ROLE_OPTIONS } from '../contract';
import { useCreateUserMutation } from '../hooks/useCreateUserMutation';
import { usePermissionsQuery } from '../hooks/usePermissionsQuery';
import { useUpdateRoleMutation } from '../hooks/useUpdateRoleMutation';
import { useUsersQuery } from '../hooks/useUsersQuery';
import { PermissionMatrix } from '../components/PermissionMatrix';
import { useTranslation } from '../../../shared/i18n/translations';
import type { RoleName, UserResponse, UserRole } from '../types';

export function UsersPage() {
  const t = useTranslation();
  const { hasPermission } = useAuth();
  const { data: users = [], isLoading: isLoadingUsers, error: listError } = useUsersQuery();
  const createUserMutation = useCreateUserMutation();
  const canCreateUsers = hasPermission('users', 'write');
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
      setPassword('');
    } catch (caughtError) {
      setError(caughtError instanceof CreateUserError ? caughtError.message : t.users.errors.createFallback);
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

      <form className="glass-card max-w-2xl space-y-5 p-6" onSubmit={handleSubmit}>
        <div>
          <label className="block text-sm font-medium text-content-secondary" htmlFor="username">
            {t.users.form.usernameLabel}
          </label>
          <input
            id="username"
            name="username"
            className="mt-2 w-full rounded-xl border border-edge-input bg-surface-input px-4 py-3 text-content-primary outline-none transition focus:border-brand-500"
            value={username}
            onChange={(event) => { setUsername(event.target.value); setFieldErrors((prev) => { const { username: _, ...rest } = prev; return rest; }); }}
            autoComplete="username"
          />
          {fieldErrors.username && (
            <p className="mt-1 text-sm text-red-400" role="alert">{fieldErrors.username}</p>
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
            className="mt-2 w-full rounded-xl border border-edge-input bg-surface-input px-4 py-3 text-content-primary outline-none transition focus:border-brand-500"
            value={password}
            onChange={(event) => { setPassword(event.target.value); setFieldErrors((prev) => { const { password: _, ...rest } = prev; return rest; }); }}
            autoComplete="new-password"
          />
          {fieldErrors.password && (
            <p className="mt-1 text-sm text-red-400" role="alert">{fieldErrors.password}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-content-secondary" htmlFor="role">
            {t.users.form.roleLabel}
          </label>
          <select
            id="role"
            name="role"
            className="mt-2 w-full rounded-xl border border-edge-input bg-surface-input px-4 py-3 text-content-primary outline-none transition focus:border-brand-500"
            value={role}
            onChange={(event) => setRole(event.target.value as UserRole)}
          >
            {USER_ROLE_OPTIONS.map((option) => (
              <option key={option} value={option} className="bg-surface-primary text-content-primary">
                {option}
              </option>
            ))}
          </select>
        </div>

        <label className="flex items-center gap-3 text-sm text-content-secondary">
          <input
            type="checkbox"
            checked={isActive}
            onChange={(event) => setIsActive(event.target.checked)}
            className="h-4 w-4 rounded border-edge bg-surface-input text-brand-500"
          />
          {t.users.form.activeLabel}
        </label>

        {error && (
          <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-200" role="alert">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={!canSubmit}
          className="rounded-xl bg-brand-500 px-5 py-3 font-semibold text-white transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSubmitting ? t.users.form.submittingLabel : t.users.form.submitLabel}
        </button>
      </form>

      {createdUser && (
        <div className="glass-card max-w-2xl border-brand-500/20 bg-brand-500/5 p-6" role="status">
          <p className="text-sm font-semibold uppercase tracking-wide text-brand-400">
            {t.users.confirmation.eyebrow}
          </p>
          <h2 className="mt-2 text-xl font-bold text-content-heading">{t.users.confirmation.title}</h2>
          <p className="mt-2 text-content-secondary">
            {t.users.confirmation.detail(createdUser.username, createdUser.role)}
          </p>
        </div>
      )}

      <section className="glass-card overflow-hidden p-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-content-heading">{t.users.directory.title}</h2>
            <p className="mt-1 text-sm text-content-secondary">{t.users.directory.description}</p>
          </div>
          {isLoadingUsers && <span className="text-sm text-content-secondary">{t.users.directory.loading}</span>}
        </div>

        {listErrorMessage && (
          <div className="mt-4 rounded-xl border border-amber-500/20 bg-amber-500/10 p-4 text-sm text-amber-600 dark:text-amber-100" role="alert">
            {listErrorMessage}
          </div>
        )}

        {!isLoadingUsers && !listErrorMessage && users.length === 0 && (
          <p className="mt-4 text-sm text-content-secondary">{t.users.directory.empty}</p>
        )}

        {users.length > 0 && (
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full divide-y divide-edge text-sm">
              <thead>
                <tr className="text-left text-content-muted">
                  <th className="py-3 pr-4 font-medium">{t.users.directory.columns.username}</th>
                  <th className="px-4 py-3 font-medium">{t.users.directory.columns.role}</th>
                  <th className="px-4 py-3 font-medium">{t.users.directory.columns.status}</th>
                  <th className="pl-4 py-3 font-medium">{t.users.directory.columns.createdAt}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-edge-card text-content-primary">
                {users.map((user) => (
                  <tr key={user.user_id}>
                    <td className="py-3 pr-4 font-medium text-content-heading">{user.username}</td>
                    <td className="px-4 py-3 capitalize">{user.role}</td>
                    <td className="px-4 py-3">
                      {user.is_active ? t.users.directory.active : t.users.directory.inactive}
                    </td>
                    <td className="pl-4 py-3 text-content-secondary">{new Date(user.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section>
        <button
          type="button"
          onClick={() => setPermissionsOpen((prev) => !prev)}
          className="flex w-full items-center justify-between rounded-xl border border-edge bg-surface-hover px-6 py-4 text-left transition hover:bg-surface-secondary"
        >
          <span className="text-lg font-semibold text-content-heading">{t.users.permissions.sectionTitle}</span>
          {permissionsOpen ? (
            <ChevronDown aria-hidden="true" className="h-5 w-5 text-content-muted" />
          ) : (
            <ChevronRight aria-hidden="true" className="h-5 w-5 text-content-muted" />
          )}
        </button>

        {permissionsOpen && (
          <div className="mt-4 space-y-4">
            {permissionsError && (
              <div className="glass-card border-red-500/20 bg-red-500/5 p-4 text-sm text-red-300" role="alert">
                {permissionsError instanceof Error ? permissionsError.message : t.users.errors.fetchFallback}
              </div>
            )}

            {permissionsSuccess && (
              <div className="glass-card border-emerald-500/20 bg-emerald-500/5 p-4 text-sm text-emerald-300" role="status">
                {permissionsSuccess}
              </div>
            )}

            {permissionsErrorMessage && (
              <div className="glass-card border-red-500/20 bg-red-500/5 p-4 text-sm text-red-300" role="alert">
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
