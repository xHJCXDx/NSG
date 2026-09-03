import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AuthProvider } from '../../auth';
import { UsersPage } from './UsersPage';

const encodePayload = (payload: unknown) =>
  btoa(JSON.stringify(payload)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');

const adminToken = `header.${encodePayload({ role: 'admin', auth_source: 'database' })}.signature`;

const renderUsersPage = (token = adminToken) => {
  localStorage.setItem('token', token);
  return render(
    <AuthProvider>
      <UsersPage />
    </AuthProvider>,
  );
};

describe('UsersPage', () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it('renders a create-user form and authoritative users list', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => [
        {
          user_id: 2,
          username: 'bob',
          role: 'analyst',
          is_active: true,
          created_at: '2026-07-16T10:00:00Z',
          updated_at: '2026-07-16T10:00:00Z',
        },
      ],
    } as Response);

    renderUsersPage();

    expect(screen.getByRole('heading', { name: 'Users' })).toBeInTheDocument();
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
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({ ok: true, json: async () => [] } as Response).mockReturnValueOnce(new Promise<Response>((resolve) => {
        resolveResponse = resolve;
      }));

    renderUsersPage();

    const submit = screen.getByRole('button', { name: 'Create user' });
    expect(submit).toBeDisabled();

    await user.type(screen.getByLabelText('Username'), ' alice ');
    await user.type(screen.getByLabelText('Password'), 'secret');
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
    expect(screen.getByLabelText('Password')).toHaveValue('');
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
      ok: false,
      status,
      json: async () => ({ detail }),
    } as Response);

    renderUsersPage();
    await user.type(screen.getByLabelText('Username'), 'alice');
    await user.type(screen.getByLabelText('Password'), 'secret');
    await user.click(screen.getByRole('button', { name: 'Create user' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(detail);
    expect(screen.queryByText('User created')).not.toBeInTheDocument();
  });

  it('labels non-admin frontend claims as UX-only while still allowing backend to answer', async () => {
    const user = userEvent.setup();
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({ ok: true, json: async () => [] } as Response).mockResolvedValueOnce({
      ok: false,
      status: 403,
      json: async () => ({ detail: 'Admins only' }),
    } as Response);

    renderUsersPage('header.invalid.signature');

    expect(screen.getByRole('note')).toHaveTextContent('presentation-only');
    await user.type(screen.getByLabelText('Username'), 'alice');
    await user.type(screen.getByLabelText('Password'), 'secret');
    await user.click(screen.getByRole('button', { name: 'Create user' }));

    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Admins only'));
  });

  it('surfaces list errors separately from the create-user form', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: false,
      status: 403,
      json: async () => ({ detail: 'Admins only' }),
    } as Response);

    renderUsersPage();

    expect(await screen.findByRole('alert')).toHaveTextContent('Admins only');
    expect(screen.getByRole('button', { name: 'Create user' })).toBeDisabled();
  });
});
