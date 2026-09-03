import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it } from 'vitest';
import { AuthProvider } from '../../features/auth';
import { ProtectedRoute } from './ProtectedRoute';

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
});
