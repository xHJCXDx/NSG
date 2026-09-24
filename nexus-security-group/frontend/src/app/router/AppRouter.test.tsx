import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AuthProvider } from '../../features/auth';
import { LanguageProvider } from '../../shared/contexts/LanguageContext';
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

vi.mock('../../features/keywords', () => ({
  KeywordsPage: () => <div>Keywords page</div>,
}));

vi.mock('../../features/automation', () => ({
  AutomationPage: () => <div>Automation page</div>,
}));

vi.mock('../../features/alerts', () => ({
  AlertsPage: () => <div>Alerts page</div>,
}));

vi.mock('../../features/logs', () => ({
  LogsPage: () => <div>Logs page</div>,
}));

vi.mock('../../features/users', () => ({
  UsersPage: () => <div>Users page</div>,
}));

const encodePayload = (payload: unknown) =>
  btoa(JSON.stringify(payload)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');

const makeToken = (permissions: string[]) => `header.${encodePayload({ permissions })}.signature`;

const renderRouter = () => render(
  <AuthProvider>
    <LanguageProvider>
      <AppRouter />
    </LanguageProvider>
  </AuthProvider>,
);

describe('AppRouter', () => {
  afterEach(() => {
    cleanup();
    localStorage.clear();
    window.history.pushState({}, '', '/');
  });

  it('keeps the protected index route mounted under the dashboard layout', async () => {
    localStorage.setItem('nsg:auth:token', makeToken(['dashboard:read']));
    window.history.pushState({}, '', '/');

    renderRouter();

    expect(screen.getByTestId('dashboard-layout')).toBeInTheDocument();
    expect(await screen.findByText('Dashboard page')).toBeInTheDocument();
  });

  it('keeps the mentions route inside the protected dashboard layout', async () => {
    localStorage.setItem('nsg:auth:token', makeToken(['mentions:read']));
    window.history.pushState({}, '', '/mentions');

    renderRouter();

    expect(screen.getByTestId('dashboard-layout')).toBeInTheDocument();
    expect(await screen.findByText('Mentions page')).toBeInTheDocument();
  });

  it('keeps the users route inside the protected dashboard layout', async () => {
    localStorage.setItem('nsg:auth:token', makeToken(['users:read']));
    window.history.pushState({}, '', '/users');

    renderRouter();

    expect(screen.getByTestId('dashboard-layout')).toBeInTheDocument();
    expect(await screen.findByText('Users page')).toBeInTheDocument();
  });

  it('keeps the keywords route inside the protected dashboard layout', async () => {
    localStorage.setItem('nsg:auth:token', makeToken(['keywords:read']));
    window.history.pushState({}, '', '/keywords');

    renderRouter();

    expect(screen.getByTestId('dashboard-layout')).toBeInTheDocument();
    expect(await screen.findByText('Keywords page')).toBeInTheDocument();
  });

  it('keeps the automation route inside the protected dashboard layout', async () => {
    localStorage.setItem('nsg:auth:token', makeToken(['workflows:read']));
    window.history.pushState({}, '', '/automation');

    renderRouter();

    expect(screen.getByTestId('dashboard-layout')).toBeInTheDocument();
    expect(await screen.findByText('Automation page')).toBeInTheDocument();
  });

  it('keeps the alerts route inside the protected dashboard layout', async () => {
    localStorage.setItem('nsg:auth:token', makeToken(['alerts:read']));
    window.history.pushState({}, '', '/alerts');

    renderRouter();

    expect(screen.getByTestId('dashboard-layout')).toBeInTheDocument();
    expect(await screen.findByText('Alerts page')).toBeInTheDocument();
  });

  it('keeps the logs route inside the protected dashboard layout', async () => {
    localStorage.setItem('nsg:auth:token', makeToken(['logs:read']));
    window.history.pushState({}, '', '/logs');

    renderRouter();

    expect(screen.getByTestId('dashboard-layout')).toBeInTheDocument();
    expect(await screen.findByText('Logs page')).toBeInTheDocument();
  });

  it('redirects unauthenticated users away from the users route', () => {
    window.history.pushState({}, '', '/users');

    renderRouter();

    expect(screen.queryByTestId('dashboard-layout')).not.toBeInTheDocument();
    expect(screen.queryByText('Users page')).not.toBeInTheDocument();
  });

  it('blocks authenticated users from feature routes when the JWT permission is missing', () => {
    localStorage.setItem('nsg:auth:token', makeToken(['dashboard:read']));
    window.history.pushState({}, '', '/users');

    renderRouter();

    expect(screen.getByRole('alert')).toHaveTextContent('users:read');
    expect(screen.queryByText('Users page')).not.toBeInTheDocument();
  });

  it('blocks authenticated users from keywords when keywords:read is missing', () => {
    localStorage.setItem('nsg:auth:token', makeToken(['dashboard:read']));
    window.history.pushState({}, '', '/keywords');

    renderRouter();

    expect(screen.getByRole('alert')).toHaveTextContent('keywords:read');
    expect(screen.queryByText('Keywords page')).not.toBeInTheDocument();
  });

  it('blocks authenticated users from automation when workflows:read is missing', () => {
    localStorage.setItem('nsg:auth:token', makeToken(['dashboard:read']));
    window.history.pushState({}, '', '/automation');

    renderRouter();

    expect(screen.getByRole('alert')).toHaveTextContent('workflows:read');
    expect(screen.queryByText('Automation page')).not.toBeInTheDocument();
  });

  it('blocks authenticated users from alerts when alerts:read is missing', () => {
    localStorage.setItem('nsg:auth:token', makeToken(['dashboard:read']));
    window.history.pushState({}, '', '/alerts');

    renderRouter();

    expect(screen.getByRole('alert')).toHaveTextContent('alerts:read');
    expect(screen.queryByText('Alerts page')).not.toBeInTheDocument();
  });

  it('blocks authenticated users from logs when logs:read is missing', () => {
    localStorage.setItem('nsg:auth:token', makeToken(['dashboard:read']));
    window.history.pushState({}, '', '/logs');

    renderRouter();

    expect(screen.getByRole('alert')).toHaveTextContent('logs:read');
    expect(screen.queryByText('Logs page')).not.toBeInTheDocument();
  });
});
