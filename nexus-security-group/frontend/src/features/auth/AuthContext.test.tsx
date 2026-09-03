import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import { getToken, removeToken, setToken } from '../../shared/storage/tokenStorage';
import { AuthProvider, useAuth } from './AuthContext';

function AuthProbe() {
  const { authSource, claims, isAdmin, isAuthenticated, login, logout, role, token } = useAuth();

  return (
    <div>
      <p>status: {isAuthenticated ? 'authenticated' : 'anonymous'}</p>
      <p>token: {token ?? 'none'}</p>
      <p>role: {role ?? 'none'}</p>
      <p>auth source: {authSource ?? 'none'}</p>
      <p>user id: {claims.user_id ?? 'none'}</p>
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
    setToken(makeToken({ role: 'admin', auth_source: 'database', user_id: 42 }));

    render(
      <AuthProvider>
        <AuthProbe />
      </AuthProvider>,
    );

    expect(screen.getByText('status: authenticated')).toBeInTheDocument();
    expect(screen.getByText('role: admin')).toBeInTheDocument();
    expect(screen.getByText('auth source: database')).toBeInTheDocument();
    expect(screen.getByText('user id: 42')).toBeInTheDocument();
    expect(screen.getByText('admin: yes')).toBeInTheDocument();
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
