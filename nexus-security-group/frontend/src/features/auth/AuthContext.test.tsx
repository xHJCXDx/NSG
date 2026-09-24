import { act, cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import { AUTH_UNAUTHORIZED_EVENT } from '../../shared/api/apiClient';
import { getToken, removeToken, setToken, TOKEN_STORAGE_KEY } from '../../shared/storage/tokenStorage';
import { AuthProvider, useAuth } from './AuthContext';

function AuthProbe() {
  const { authSource, claims, hasPermission, isAdmin, isAuthenticated, login, logout, permissions, role, token } = useAuth();

  return (
    <div>
      <p>status: {isAuthenticated ? 'authenticated' : 'anonymous'}</p>
      <p>token: {token ?? 'none'}</p>
      <p>role: {role ?? 'none'}</p>
      <p>auth source: {authSource ?? 'none'}</p>
      <p>user id: {claims.user_id ?? 'none'}</p>
      <p>permissions: {permissions.join(',') || 'none'}</p>
      <p>can read users: {hasPermission('users', 'read') ? 'yes' : 'no'}</p>
      <p>admin: {isAdmin ? 'yes' : 'no'}</p>
      <button onClick={() => login('fake-jwt')}>Log in</button>
      <button onClick={logout}>Log out</button>
    </div>
  );
}

const encodePayload = (payload: unknown) =>
  btoa(JSON.stringify(payload)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');

const makeToken = (payload: unknown) => `header.${encodePayload(payload)}.signature`;

describe('AuthProvider behavior', () => {
  afterEach(() => {
    cleanup();
    removeToken();
  });

  it('uses the shared token key and preserves login/logout state behavior', async () => {
    const user = userEvent.setup();

    render(
      <AuthProvider>
        <AuthProbe />
      </AuthProvider>,
    );

    expect(screen.getByText('status: anonymous')).toBeInTheDocument();
    expect(screen.getByText('token: none')).toBeInTheDocument();
    expect(screen.getByText('admin: no')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Log in' }));

    expect(getToken()).toBe('fake-jwt');
    expect(screen.getByText('status: authenticated')).toBeInTheDocument();
    expect(screen.getByText('token: fake-jwt')).toBeInTheDocument();
    expect(screen.getByText('role: none')).toBeInTheDocument();
    expect(screen.getByText('admin: no')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Log out' }));

    expect(getToken()).toBeNull();
    expect(screen.getByText('status: anonymous')).toBeInTheDocument();
  });

  it('exposes decoded claims for UX while preserving token-based auth semantics', () => {
    setToken(makeToken({ role: 'admin', auth_source: 'database', user_id: 42, permissions: ['users:read'] }));

    render(
      <AuthProvider>
        <AuthProbe />
      </AuthProvider>,
    );

    expect(screen.getByText('status: authenticated')).toBeInTheDocument();
    expect(screen.getByText('role: admin')).toBeInTheDocument();
    expect(screen.getByText('auth source: database')).toBeInTheDocument();
    expect(screen.getByText('user id: 42')).toBeInTheDocument();
    expect(screen.getByText('permissions: users:read')).toBeInTheDocument();
    expect(screen.getByText('can read users: yes')).toBeInTheDocument();
    expect(screen.getByText('admin: yes')).toBeInTheDocument();
  });

  it('treats a token with exp in the past as unauthenticated and clears it from storage', () => {
    const pastExp = Math.floor(Date.now() / 1000) - 3600;
    setToken(makeToken({ role: 'analyst', exp: pastExp }));

    render(
      <AuthProvider>
        <AuthProbe />
      </AuthProvider>,
    );

    expect(screen.getByText('status: anonymous')).toBeInTheDocument();
    expect(getToken()).toBeNull();
  });

  it('treats a token with exp in the future as authenticated', () => {
    const futureExp = Math.floor(Date.now() / 1000) + 3600;
    setToken(makeToken({ role: 'analyst', exp: futureExp }));

    render(
      <AuthProvider>
        <AuthProbe />
      </AuthProvider>,
    );

    expect(screen.getByText('status: authenticated')).toBeInTheDocument();
    expect(screen.getByText('role: analyst')).toBeInTheDocument();
    expect(getToken()).not.toBeNull();
  });

  it('syncs login from another browser tab through the storage event', () => {
    const futureExp = Math.floor(Date.now() / 1000) + 3600;
    const nextToken = makeToken({ role: 'analyst', auth_source: 'database', permissions: ['dashboard:read'], exp: futureExp });

    render(
      <AuthProvider>
        <AuthProbe />
      </AuthProvider>,
    );

    expect(screen.getByText('status: anonymous')).toBeInTheDocument();

    localStorage.setItem(TOKEN_STORAGE_KEY, nextToken);
    act(() => {
      window.dispatchEvent(new StorageEvent('storage', { key: TOKEN_STORAGE_KEY, newValue: nextToken }));
    });

    expect(screen.getByText('status: authenticated')).toBeInTheDocument();
    expect(screen.getByText('role: analyst')).toBeInTheDocument();
    expect(screen.getByText('auth source: database')).toBeInTheDocument();
  });

  it('syncs logout from another browser tab through the storage event', () => {
    const futureExp = Math.floor(Date.now() / 1000) + 3600;
    const currentToken = makeToken({ role: 'analyst', exp: futureExp });
    setToken(currentToken);

    render(
      <AuthProvider>
        <AuthProbe />
      </AuthProvider>,
    );

    expect(screen.getByText('status: authenticated')).toBeInTheDocument();

    localStorage.removeItem(TOKEN_STORAGE_KEY);
    act(() => {
      window.dispatchEvent(new StorageEvent('storage', { key: TOKEN_STORAGE_KEY, oldValue: currentToken, newValue: null }));
    });

    expect(screen.getByText('status: anonymous')).toBeInTheDocument();
    expect(screen.getByText('token: none')).toBeInTheDocument();
  });

  it('ignores unrelated localStorage changes from other tabs', () => {
    render(
      <AuthProvider>
        <AuthProbe />
      </AuthProvider>,
    );

    act(() => {
      window.dispatchEvent(new StorageEvent('storage', { key: 'theme', newValue: 'light' }));
    });

    expect(screen.getByText('status: anonymous')).toBeInTheDocument();
    expect(screen.getByText('token: none')).toBeInTheDocument();
  });

  it('clears the stored token when an unauthorized session event is emitted', () => {
    const futureExp = Math.floor(Date.now() / 1000) + 3600;
    setToken(makeToken({ role: 'analyst', exp: futureExp }));

    render(
      <AuthProvider>
        <AuthProbe />
      </AuthProvider>,
    );

    expect(screen.getByText('status: authenticated')).toBeInTheDocument();

    act(() => {
      window.dispatchEvent(new CustomEvent(AUTH_UNAUTHORIZED_EVENT));
    });

    expect(getToken()).toBeNull();
    expect(screen.getByText('status: anonymous')).toBeInTheDocument();
    expect(screen.getByText('token: none')).toBeInTheDocument();
  });

  it('keeps malformed tokens authenticated but non-admin for presentation claims', () => {
    setToken('malformed-token');

    render(
      <AuthProvider>
        <AuthProbe />
      </AuthProvider>,
    );

    expect(screen.getByText('status: authenticated')).toBeInTheDocument();
    expect(screen.getByText('role: none')).toBeInTheDocument();
    expect(screen.getByText('auth source: none')).toBeInTheDocument();
    expect(screen.getByText('admin: no')).toBeInTheDocument();
  });
});
