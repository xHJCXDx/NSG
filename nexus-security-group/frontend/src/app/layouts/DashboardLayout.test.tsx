import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it } from 'vitest';
import { AuthProvider } from '../../features/auth';
import { LanguageProvider } from '../../shared/contexts/LanguageContext';
import { DashboardLayout } from './DashboardLayout';

const encodePayload = (payload: unknown) =>
  btoa(JSON.stringify(payload)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');

const makeToken = (permissions: string[]) => `header.${encodePayload({ permissions })}.signature`;

describe('DashboardLayout navigation', () => {
  afterEach(() => {
    cleanup();
    localStorage.clear();
  });

  it('includes a Keywords destination inside the dashboard navigation when permitted', async () => {
    localStorage.setItem('nsg:auth:token', makeToken(['dashboard:read', 'keywords:read']));
    render(
      <AuthProvider>
        <LanguageProvider>
          <MemoryRouter initialEntries={['/']}>
            <Routes>
              <Route path="/" element={<DashboardLayout />}>
                <Route index element={<div>Dashboard content</div>} />
                <Route path="keywords" element={<div>Keywords content</div>} />
              </Route>
            </Routes>
          </MemoryRouter>
        </LanguageProvider>
      </AuthProvider>,
    );

    await userEvent.click(screen.getByRole('link', { name: /Keywords/i }));

    expect(screen.getByText('Keywords content')).toBeInTheDocument();
  });

  it('groups permitted destinations under readable headings without turning headings into links', () => {
    localStorage.setItem(
      'nsg:auth:token',
      makeToken([
        'dashboard:read',
        'metrics:read',
        'mentions:read',
        'threats:read',
        'keywords:read',
        'workflows:read',
        'alerts:read',
        'logs:read',
        'users:read',
        'permissions:read',
      ]),
    );

    render(
      <AuthProvider>
        <LanguageProvider>
          <MemoryRouter initialEntries={['/']}>
            <Routes>
              <Route path="/" element={<DashboardLayout />}>
                <Route index element={<div>Dashboard content</div>} />
              </Route>
            </Routes>
          </MemoryRouter>
        </LanguageProvider>
      </AuthProvider>,
    );

    expect(screen.getByRole('heading', { name: /Overview/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /OSINT/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Operations/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Administration/i })).toBeInTheDocument();

    expect(screen.queryByRole('link', { name: /Overview/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Operations/i })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Dashboard/i })).toHaveAttribute('href', '/');
    expect(screen.getByRole('link', { name: /Analytics/i })).toHaveAttribute('href', '/analytics');
    expect(screen.getByRole('link', { name: /Mentions/i })).toHaveAttribute('href', '/mentions');
    expect(screen.getByRole('link', { name: /Threats/i })).toHaveAttribute('href', '/threats');
    expect(screen.getByRole('link', { name: /Keywords/i })).toHaveAttribute('href', '/keywords');
    expect(screen.getByRole('link', { name: /Automation/i })).toHaveAttribute('href', '/automation');
    expect(screen.getByRole('link', { name: /Alerts/i })).toHaveAttribute('href', '/alerts');
    expect(screen.getByRole('link', { name: /Logs/i })).toHaveAttribute('href', '/logs');
    expect(screen.getByRole('link', { name: /Users/i })).toHaveAttribute('href', '/users');
    expect(screen.getByRole('link', { name: /Settings/i })).toHaveAttribute('href', '/settings');
  });

  it('hides destinations missing from JWT permissions', () => {
    localStorage.setItem('nsg:auth:token', makeToken(['dashboard:read']));

    render(
      <AuthProvider>
        <LanguageProvider>
          <MemoryRouter initialEntries={['/']}>
            <Routes>
              <Route path="/" element={<DashboardLayout />}>
                <Route index element={<div>Dashboard content</div>} />
              </Route>
            </Routes>
          </MemoryRouter>
        </LanguageProvider>
      </AuthProvider>,
    );

    expect(screen.getByRole('link', { name: /Dashboard/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Overview/i })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Users/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Keywords/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Automation/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Alerts/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Logs/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /OSINT/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /Operations/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /Administration/i })).not.toBeInTheDocument();
  });

  it('shows the Automation destination only when workflows:read is present', () => {
    localStorage.setItem('nsg:auth:token', makeToken(['dashboard:read', 'workflows:read']));

    render(
      <AuthProvider>
        <LanguageProvider>
          <MemoryRouter initialEntries={['/']}>
            <Routes>
              <Route path="/" element={<DashboardLayout />}>
                <Route index element={<div>Dashboard content</div>} />
                <Route path="automation" element={<div>Automation content</div>} />
              </Route>
            </Routes>
          </MemoryRouter>
        </LanguageProvider>
      </AuthProvider>,
    );

    expect(screen.getByRole('link', { name: /Automation/i })).toHaveAttribute('href', '/automation');
  });

  it('shows the Alerts destination only when alerts:read is present', () => {
    localStorage.setItem('nsg:auth:token', makeToken(['dashboard:read', 'alerts:read']));

    render(
      <AuthProvider>
        <LanguageProvider>
          <MemoryRouter initialEntries={['/']}>
            <Routes>
              <Route path="/" element={<DashboardLayout />}>
                <Route index element={<div>Dashboard content</div>} />
                <Route path="alerts" element={<div>Alerts content</div>} />
              </Route>
            </Routes>
          </MemoryRouter>
        </LanguageProvider>
      </AuthProvider>,
    );

    expect(screen.getByRole('link', { name: /Alerts/i })).toHaveAttribute('href', '/alerts');
  });

  it('shows the Logs destination only when logs:read is present', () => {
    localStorage.setItem('nsg:auth:token', makeToken(['dashboard:read', 'logs:read']));

    render(
      <AuthProvider>
        <LanguageProvider>
          <MemoryRouter initialEntries={['/']}>
            <Routes>
              <Route path="/" element={<DashboardLayout />}>
                <Route index element={<div>Dashboard content</div>} />
                <Route path="logs" element={<div>Logs content</div>} />
              </Route>
            </Routes>
          </MemoryRouter>
        </LanguageProvider>
      </AuthProvider>,
    );

    expect(screen.getByRole('link', { name: /Logs/i })).toHaveAttribute('href', '/logs');
  });
});
