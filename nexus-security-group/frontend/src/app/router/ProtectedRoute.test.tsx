import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it } from 'vitest';
import { AuthProvider } from '../../features/auth';
import { ProtectedRoute } from './ProtectedRoute';

const encodePayload = (payload: unknown) =>
  btoa(JSON.stringify(payload)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');

const makeToken = (permissions: string[]) => `header.${encodePayload({ permissions })}.signature`;

describe('ProtectedRoute', () => {
  afterEach(() => {
    cleanup();
    localStorage.clear();
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

  it('renders a UX-only restricted state when a required permission is missing', () => {
    localStorage.setItem('token', makeToken(['dashboard:read']));

    render(
      <AuthProvider>
        <MemoryRouter initialEntries={['/users']}>
          <Routes>
            <Route path="/users" element={<ProtectedRoute requiredPermission="users:read"><div>Users page</div></ProtectedRoute>} />
          </Routes>
        </MemoryRouter>
      </AuthProvider>,
    );

    expect(screen.getByRole('alert')).toHaveTextContent('users:read');
    expect(screen.queryByText('Users page')).not.toBeInTheDocument();
  });

  it('renders protected content when the required permission exists', () => {
    localStorage.setItem('token', makeToken(['users:read']));

    render(
      <AuthProvider>
        <MemoryRouter initialEntries={['/users']}>
          <Routes>
            <Route path="/users" element={<ProtectedRoute requiredPermission="users:read"><div>Users page</div></ProtectedRoute>} />
          </Routes>
        </MemoryRouter>
      </AuthProvider>,
    );

    expect(screen.getByText('Users page')).toBeInTheDocument();
  });
});
