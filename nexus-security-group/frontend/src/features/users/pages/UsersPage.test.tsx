import { QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createTestQueryClient } from '../../../shared/test/createTestQueryClient';
import { LanguageProvider } from '../../../shared/contexts/LanguageContext';
import { AuthProvider } from '../../auth';
import { UsersPage } from './UsersPage';

const encodePayload = (payload: unknown) =>
  btoa(JSON.stringify(payload)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');

const adminToken = `header.${encodePayload({ role: 'admin', auth_source: 'database', permissions: ['users:read', 'users:write'] })}.signature`;

const permissionsResponse = {
  permissions: [],
  role_permissions: { admin: [], analyst: [] },
};

const bobUser = {
  user_id: 2,
  username: 'bob',
  role: 'analyst',
  is_active: true,
  created_at: '2026-07-16T10:00:00Z',
  updated_at: '2026-07-16T10:00:00Z',
};

const renderUsersPage = (token = adminToken) => {
  localStorage.setItem('nsg:auth:token', token);
  return render(
    <QueryClientProvider client={createTestQueryClient()}>
      <LanguageProvider>
        <AuthProvider>
          <UsersPage />
        </AuthProvider>
      </LanguageProvider>
    </QueryClientProvider>,
  );
};

describe('UsersPage', () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it('renders a create-user form and authoritative users list', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => [
        bobUser,
      ],
    } as Response).mockResolvedValueOnce({ ok: true, json: async () => permissionsResponse } as Response);

    renderUsersPage();

    expect(screen.getByRole('heading', { name: 'Users' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Create user' }));
    expect(screen.getByLabelText('Username')).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
    expect(screen.getByLabelText('Role')).toBeInTheDocument();
    expect(screen.getByLabelText('Active user')).toBeChecked();
    expect(await screen.findByRole('table')).toBeInTheDocument();
    expect(screen.getByText('bob')).toBeInTheDocument();
  });

  it('disables submit until valid fields exist and shows success confirmation while clearing password', async () => {
    const user = userEvent.setup();
    let resolveResponse: (response: Response) => void = () => undefined;
    const aliceUser = {
      user_id: 7,
      username: 'alice',
      role: 'admin',
      is_active: true,
      created_at: '2026-07-15T10:00:00Z',
      updated_at: '2026-07-15T10:00:00Z',
    };
    const fetchMock = vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce({ ok: true, json: async () => [] } as Response)
      .mockResolvedValueOnce({ ok: true, json: async () => permissionsResponse } as Response)
      .mockReturnValueOnce(new Promise<Response>((resolve) => {
        resolveResponse = resolve;
      }))
      .mockResolvedValueOnce({ ok: true, json: async () => [aliceUser] } as Response);

    renderUsersPage();

    await user.click(screen.getByRole('button', { name: 'Create user' }));
    const submit = screen.getAllByRole('button', { name: 'Create user' }).at(-1)!;
    expect(submit).toBeDisabled();

    await user.type(screen.getByLabelText('Username'), ' alice ');
    await user.type(screen.getByLabelText('Password'), 'secret-pw');
    await user.selectOptions(screen.getByLabelText('Role'), 'admin');
    await user.click(submit);

    expect(screen.getByRole('button', { name: 'Creating user...' })).toBeDisabled();

    resolveResponse({
      ok: true,
      json: async () => ({
        user_id: 7,
        username: 'alice',
        role: 'admin',
        is_active: true,
        created_at: '2026-07-15T10:00:00Z',
        updated_at: '2026-07-15T10:00:00Z',
      }),
    } as Response);

    expect(await screen.findByText('User created')).toBeInTheDocument();
    await waitFor(() => expect(screen.getAllByText('alice')).toHaveLength(1));
    expect(screen.getByText(/Backend confirmed alice as admin/)).toBeInTheDocument();
    expect(screen.queryByLabelText('Password')).not.toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith('/api/users', expect.objectContaining({ body: expect.stringContaining('"username":"alice"') }));
  });

  it.each([
    [409, 'Username already exists'],
    [422, 'Password is too short'],
    [401, 'Session expired'],
    [403, 'Admins only'],
  ])('surfaces actionable backend errors for %i responses', async (status, detail) => {
    const user = userEvent.setup();
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({ ok: true, json: async () => [] } as Response).mockResolvedValueOnce({
      ok: true,
      json: async () => permissionsResponse,
    } as Response).mockResolvedValueOnce({
      ok: false,
      status,
      json: async () => ({ detail }),
    } as Response);

    renderUsersPage();
    await user.click(screen.getByRole('button', { name: 'Create user' }));
    await user.type(screen.getByLabelText('Username'), 'alice');
    await user.type(screen.getByLabelText('Password'), 'secret-pw');
    await user.click(screen.getAllByRole('button', { name: 'Create user' }).at(-1)!);

    expect(await screen.findByRole('alert')).toHaveTextContent(detail);
    expect(screen.queryByText('User created')).not.toBeInTheDocument();
  });

  it('labels missing users:write claims as UX-only and disables create action', async () => {
    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce({ ok: true, json: async () => [] } as Response)
      .mockResolvedValueOnce({ ok: true, json: async () => permissionsResponse } as Response);

    renderUsersPage(`header.${encodePayload({ permissions: ['users:read'] })}.signature`);

    expect(screen.getByRole('note')).toHaveTextContent('users:write');
    expect(screen.queryByRole('button', { name: 'Create user' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Edit' })).not.toBeInTheDocument();
  });

  it('shows inline validation error for short password without calling the API', async () => {
    const user = userEvent.setup();
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce({ ok: true, json: async () => [] } as Response)
      .mockResolvedValueOnce({ ok: true, json: async () => permissionsResponse } as Response);

    renderUsersPage();

    await user.click(screen.getByRole('button', { name: 'Create user' }));
    await user.type(screen.getByLabelText('Username'), 'alice');
    await user.type(screen.getByLabelText('Password'), 'short');
    await user.click(screen.getAllByRole('button', { name: 'Create user' }).at(-1)!);

    expect(screen.getByText('Password must be at least 8 characters')).toBeInTheDocument();
    expect(fetchSpy).toHaveBeenCalledTimes(2);
    expect(screen.queryByText('User created')).not.toBeInTheDocument();
  });

  it('surfaces list errors separately from the create-user form', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: false,
      status: 403,
      json: async () => ({ detail: 'Admins only' }),
    } as Response).mockResolvedValueOnce({ ok: true, json: async () => permissionsResponse } as Response);

    renderUsersPage();

    expect(await screen.findByRole('alert')).toHaveTextContent('Admins only');
    expect(screen.getByRole('button', { name: 'Create user' })).toBeEnabled();
  });

  it('lets users with users:write edit role, active state, and optional password inline', async () => {
    const user = userEvent.setup();
    const fetchMock = vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce({ ok: true, json: async () => [bobUser] } as Response)
      .mockResolvedValueOnce({ ok: true, json: async () => permissionsResponse } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ...bobUser, role: 'admin', is_active: false }),
      } as Response)
      .mockResolvedValueOnce({ ok: true, json: async () => [{ ...bobUser, role: 'admin', is_active: false }] } as Response);

    renderUsersPage();

    expect(await screen.findByText('bob')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Edit' }));

    expect(screen.getByText('Edit bob')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save changes' })).toBeDisabled();

    await user.selectOptions(screen.getByLabelText('Role'), 'admin');
    await user.click(screen.getByLabelText('Active user'));
    await user.type(screen.getByLabelText('New password (optional)'), 'new-secret');
    await user.click(screen.getByRole('button', { name: 'Save changes' }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith('/api/users/2', expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify({ role: 'admin', is_active: false, password: 'new-secret' }),
      }));
    });
    expect(await screen.findByText('bob updated successfully.')).toBeInTheDocument();
  });
});
