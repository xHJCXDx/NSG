import { useState, type FormEvent } from 'react';
import { useAuth } from '../../auth';
import { CreateUserError } from '../api';
import { USER_ROLE_OPTIONS, USERS_COPY } from '../contract';
import { useCreateUserMutation } from '../hooks/useCreateUserMutation';
import { useUsersQuery } from '../hooks/useUsersQuery';
import type { UserResponse, UserRole } from '../types';

export function UsersPage() {
  const { hasPermission } = useAuth();
  const { data: users = [], isLoading: isLoadingUsers, error: listError } = useUsersQuery();
  const createUserMutation = useCreateUserMutation();
  const canCreateUsers = hasPermission('users', 'write');

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('analyst');
  const [isActive, setIsActive] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [createdUser, setCreatedUser] = useState<UserResponse | null>(null);

  const isSubmitting = createUserMutation.isPending;
  const canSubmit = canCreateUsers && username.trim().length > 0 && password.length > 0 && !isSubmitting;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setCreatedUser(null);

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
      setError(caughtError instanceof CreateUserError ? caughtError.message : USERS_COPY.errors.createFallback);
    }
  };

  const listErrorMessage = listError
    ? (listError instanceof Error ? listError.message : USERS_COPY.errors.listFallback)
    : null;

  return (
    <section className="space-y-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-wide text-brand-400">{USERS_COPY.page.eyebrow}</p>
        <h1 className="mt-2 text-3xl font-bold text-white">{USERS_COPY.page.title}</h1>
        <p className="mt-2 max-w-3xl text-gray-400">{USERS_COPY.page.description}</p>
      </div>

      {!canCreateUsers && (
        <div className="glass-card border-amber-500/20 bg-amber-500/5 p-4 text-sm text-amber-100" role="note">
          {USERS_COPY.authNotice.nonAdmin}
        </div>
      )}

      <form className="glass-card max-w-2xl space-y-5 p-6" onSubmit={handleSubmit}>
        <div>
          <label className="block text-sm font-medium text-gray-200" htmlFor="username">
            {USERS_COPY.form.usernameLabel}
          </label>
          <input
            id="username"
            name="username"
            className="mt-2 w-full rounded-xl border border-white/10 bg-dark-800 px-4 py-3 text-white outline-none transition focus:border-brand-500"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            autoComplete="username"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-200" htmlFor="password">
            {USERS_COPY.form.passwordLabel}
          </label>
          <input
            id="password"
            name="password"
            type="password"
            className="mt-2 w-full rounded-xl border border-white/10 bg-dark-800 px-4 py-3 text-white outline-none transition focus:border-brand-500"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="new-password"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-200" htmlFor="role">
            {USERS_COPY.form.roleLabel}
          </label>
          <select
            id="role"
            name="role"
            className="mt-2 w-full rounded-xl border border-white/10 bg-dark-800 px-4 py-3 text-white outline-none transition focus:border-brand-500"
            value={role}
            onChange={(event) => setRole(event.target.value as UserRole)}
          >
            {USER_ROLE_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>

        <label className="flex items-center gap-3 text-sm text-gray-200">
          <input
            type="checkbox"
            checked={isActive}
            onChange={(event) => setIsActive(event.target.checked)}
            className="h-4 w-4 rounded border-white/10 bg-dark-800 text-brand-500"
          />
          {USERS_COPY.form.activeLabel}
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
          {isSubmitting ? USERS_COPY.form.submittingLabel : USERS_COPY.form.submitLabel}
        </button>
      </form>

      {createdUser && (
        <div className="glass-card max-w-2xl border-brand-500/20 bg-brand-500/5 p-6" role="status">
          <p className="text-sm font-semibold uppercase tracking-wide text-brand-400">
            {USERS_COPY.confirmation.eyebrow}
          </p>
          <h2 className="mt-2 text-xl font-bold text-white">{USERS_COPY.confirmation.title}</h2>
          <p className="mt-2 text-gray-300">
            {USERS_COPY.confirmation.detail(createdUser.username, createdUser.role)}
          </p>
        </div>
      )}

      <section className="glass-card overflow-hidden p-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-white">{USERS_COPY.directory.title}</h2>
            <p className="mt-1 text-sm text-gray-400">{USERS_COPY.directory.description}</p>
          </div>
          {isLoadingUsers && <span className="text-sm text-gray-400">{USERS_COPY.directory.loading}</span>}
        </div>

        {listErrorMessage && (
          <div className="mt-4 rounded-xl border border-amber-500/20 bg-amber-500/10 p-4 text-sm text-amber-100" role="alert">
            {listErrorMessage}
          </div>
        )}

        {!isLoadingUsers && !listErrorMessage && users.length === 0 && (
          <p className="mt-4 text-sm text-gray-400">{USERS_COPY.directory.empty}</p>
        )}

        {users.length > 0 && (
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full divide-y divide-white/10 text-sm">
              <thead>
                <tr className="text-left text-gray-400">
                  <th className="py-3 pr-4 font-medium">{USERS_COPY.directory.columns.username}</th>
                  <th className="px-4 py-3 font-medium">{USERS_COPY.directory.columns.role}</th>
                  <th className="px-4 py-3 font-medium">{USERS_COPY.directory.columns.status}</th>
                  <th className="pl-4 py-3 font-medium">{USERS_COPY.directory.columns.created}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-gray-200">
                {users.map((user) => (
                  <tr key={user.user_id}>
                    <td className="py-3 pr-4 font-medium text-white">{user.username}</td>
                    <td className="px-4 py-3 capitalize">{user.role}</td>
                    <td className="px-4 py-3">
                      {user.is_active ? USERS_COPY.directory.status.active : USERS_COPY.directory.status.inactive}
                    </td>
                    <td className="pl-4 py-3 text-gray-400">{new Date(user.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </section>
  );
}
