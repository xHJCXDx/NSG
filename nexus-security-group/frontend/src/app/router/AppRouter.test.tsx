import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AuthProvider } from '../../features/auth';
import { AppRouter } from './AppRouter';

vi.mock('../layouts/DashboardLayout', async () => {
  const { Outlet } = await import('react-router-dom');

  return {
    DashboardLayout: () => (
      <div data-testid="dashboard-layout">
        <Outlet />
      </div>
    ),
  };
});

vi.mock('../../features/dashboard', () => ({
  DashboardPage: () => <div>Dashboard page</div>,
}));

vi.mock('../../features/mentions', () => ({
  MentionsPage: () => <div>Mentions page</div>,
}));

vi.mock('../../features/threats', () => ({
  ThreatsPage: () => <div>Threats page</div>,
}));

vi.mock('../../features/users', () => ({
  UsersPage: () => <div>Users page</div>,
}));

const encodePayload = (payload: unknown) =>
  btoa(JSON.stringify(payload)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');

const makeToken = (permissions: string[]) => `header.${encodePayload({ permissions })}.signature`;

describe('AppRouter', () => {
  afterEach(() => {
    cleanup();
    localStorage.clear();
    window.history.pushState({}, '', '/');
  });

  it('keeps the protected index route mounted under the dashboard layout', () => {
    localStorage.setItem('token', makeToken(['dashboard:read']));
    window.history.pushState({}, '', '/');

    render(
      <AuthProvider>
        <AppRouter />
      </AuthProvider>,
    );

    expect(screen.getByTestId('dashboard-layout')).toBeInTheDocument();
    expect(screen.getByText('Dashboard page')).toBeInTheDocument();
  });

  it('keeps the mentions route inside the protected dashboard layout', () => {
    localStorage.setItem('token', makeToken(['mentions:read']));
    window.history.pushState({}, '', '/mentions');

    render(
      <AuthProvider>
        <AppRouter />
      </AuthProvider>,
    );

    expect(screen.getByTestId('dashboard-layout')).toBeInTheDocument();
    expect(screen.getByText('Mentions page')).toBeInTheDocument();
  });

  it('keeps the users route inside the protected dashboard layout', () => {
    localStorage.setItem('token', makeToken(['users:read']));
    window.history.pushState({}, '', '/users');

    render(
      <AuthProvider>
        <AppRouter />
      </AuthProvider>,
    );

    expect(screen.getByTestId('dashboard-layout')).toBeInTheDocument();
    expect(screen.getByText('Users page')).toBeInTheDocument();
  });

  it('redirects unauthenticated users away from the users route', () => {
    window.history.pushState({}, '', '/users');

    render(
      <AuthProvider>
        <AppRouter />
      </AuthProvider>,
    );

    expect(screen.queryByTestId('dashboard-layout')).not.toBeInTheDocument();
    expect(screen.queryByText('Users page')).not.toBeInTheDocument();
  });

  it('blocks authenticated users from feature routes when the JWT permission is missing', () => {
    localStorage.setItem('token', makeToken(['dashboard:read']));
    window.history.pushState({}, '', '/users');

    render(
      <AuthProvider>
        <AppRouter />
      </AuthProvider>,
    );

    expect(screen.getByRole('alert')).toHaveTextContent('users:read');
    expect(screen.queryByText('Users page')).not.toBeInTheDocument();
  });
});
