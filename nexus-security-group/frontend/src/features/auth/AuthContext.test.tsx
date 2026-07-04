import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it } from 'vitest';
import { ProtectedRoute } from '../../app/router/ProtectedRoute';
import { AuthProvider, useAuth } from './AuthContext';

function AuthProbe() {
  const { isAuthenticated, login, logout, token } = useAuth();

  return (
    <div>
      <p>status: {isAuthenticated ? 'authenticated' : 'anonymous'}</p>
      <p>token: {token ?? 'none'}</p>
      <button onClick={() => login('fake-jwt')}>Log in</button>
      <button onClick={logout}>Log out</button>
    </div>
  );
}

describe('AuthProvider behavior', () => {
  afterEach(() => {
    cleanup();
    localStorage.clear();
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

    await user.click(screen.getByRole('button', { name: 'Log in' }));

    expect(localStorage.getItem('token')).toBe('fake-jwt');
    expect(screen.getByText('status: authenticated')).toBeInTheDocument();
    expect(screen.getByText('token: fake-jwt')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Log out' }));

    expect(localStorage.getItem('token')).toBeNull();
    expect(screen.getByText('status: anonymous')).toBeInTheDocument();
  });

  it('keeps protected routes behind auth and redirects anonymous users to login', () => {
    render(
      <AuthProvider>
        <MemoryRouter initialEntries={['/analytics']}>
          <Routes>
            <Route path="/login" element={<div>Login page</div>} />
            <Route
              path="/analytics"
              element={
                <ProtectedRoute>
                  <div>Analytics page</div>
                </ProtectedRoute>
              }
            />
          </Routes>
        </MemoryRouter>
      </AuthProvider>,
    );

    expect(screen.getByText('Login page')).toBeInTheDocument();
    expect(screen.queryByText('Analytics page')).not.toBeInTheDocument();
  });

  it('renders protected route content when a token already exists', () => {
    localStorage.setItem('token', 'existing-jwt');

    render(
      <AuthProvider>
        <MemoryRouter initialEntries={['/analytics']}>
          <Routes>
            <Route path="/login" element={<div>Login page</div>} />
            <Route
              path="/analytics"
              element={
                <ProtectedRoute>
                  <div>Analytics page</div>
                </ProtectedRoute>
              }
            />
          </Routes>
        </MemoryRouter>
      </AuthProvider>,
    );

    expect(screen.getByText('Analytics page')).toBeInTheDocument();
    expect(screen.queryByText('Login page')).not.toBeInTheDocument();
  });
});
