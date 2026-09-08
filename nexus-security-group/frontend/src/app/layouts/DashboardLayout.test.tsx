import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it } from 'vitest';
import { AuthProvider } from '../../features/auth';
import { DashboardLayout } from './DashboardLayout';

const encodePayload = (payload: unknown) =>
  btoa(JSON.stringify(payload)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');

const makeToken = (permissions: string[]) => `header.${encodePayload({ permissions })}.signature`;

describe('DashboardLayout navigation', () => {
  afterEach(() => {
    cleanup();
    localStorage.clear();
  });

  it('includes a Users destination inside the dashboard navigation', async () => {
    localStorage.setItem('token', makeToken(['dashboard:read', 'users:read']));
    render(
      <AuthProvider>
        <MemoryRouter initialEntries={['/']}>
          <Routes>
            <Route path="/" element={<DashboardLayout />}>
              <Route index element={<div>Dashboard content</div>} />
              <Route path="users" element={<div>Users content</div>} />
            </Route>
          </Routes>
        </MemoryRouter>
      </AuthProvider>,
    );

    await userEvent.click(screen.getByRole('button', { name: /Users/i }));

    expect(screen.getByText('Users content')).toBeInTheDocument();
  });

  it('hides destinations missing from JWT permissions', () => {
    localStorage.setItem('token', makeToken(['dashboard:read']));

    render(
      <AuthProvider>
        <MemoryRouter initialEntries={['/']}>
          <Routes>
            <Route path="/" element={<DashboardLayout />}>
              <Route index element={<div>Dashboard content</div>} />
            </Route>
          </Routes>
        </MemoryRouter>
      </AuthProvider>,
    );

    expect(screen.getByRole('button', { name: /Dashboard/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Users/i })).not.toBeInTheDocument();
  });
});
