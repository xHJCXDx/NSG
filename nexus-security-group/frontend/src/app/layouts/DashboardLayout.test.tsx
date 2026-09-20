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
    expect(screen.queryByRole('link', { name: /Users/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Keywords/i })).not.toBeInTheDocument();
  });
});
