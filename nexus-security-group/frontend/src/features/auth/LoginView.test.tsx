import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { getToken, removeToken } from '../../shared/storage/tokenStorage';
import { LanguageProvider } from '../../shared/contexts/LanguageContext';
import { AuthProvider } from './AuthContext';
import { LoginView } from './LoginView';

function renderLoginRoute() {
  return render(
    <LanguageProvider>
      <AuthProvider>
        <MemoryRouter initialEntries={['/login']}>
          <Routes>
            <Route path="/login" element={<LoginView />} />
            <Route path="/" element={<div>Dashboard route</div>} />
          </Routes>
        </MemoryRouter>
      </AuthProvider>
    </LanguageProvider>,
  );
}

describe('LoginView', () => {
  afterEach(() => {
    cleanup();
    removeToken();
    vi.restoreAllMocks();
  });

  it('shows the NSG logo without the dashboard title and discourages direct logo dragging', () => {
    renderLoginRoute();

    const logo = screen.getByAltText('Nexus Security Group');

    expect(logo).toBeInTheDocument();
    expect(logo).toHaveAttribute('draggable', 'false');
    expect(screen.queryByRole('heading', { name: 'NSG Dashboard' })).not.toBeInTheDocument();
  });

  it('submits credentials through auth API, persists the token via context, and navigates home', async () => {
    const user = userEvent.setup();
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ access_token: 'jwt-token' }),
    } as Response);

    renderLoginRoute();

    await user.type(screen.getByLabelText('Username'), 'admin');
    await user.type(screen.getByLabelText('Password'), 'secure-password');
    await user.click(screen.getByRole('button', { name: 'Sign In' }));

    expect(await screen.findByText('Dashboard route')).toBeInTheDocument();
    expect(getToken()).toBe('jwt-token');
  });

  it('shows inline error when password is shorter than 8 characters and does not call the API', async () => {
    const user = userEvent.setup();
    const fetchSpy = vi.spyOn(globalThis, 'fetch');

    renderLoginRoute();

    await user.type(screen.getByLabelText('Username'), 'admin');
    await user.type(screen.getByLabelText('Password'), 'short');
    await user.click(screen.getByRole('button', { name: 'Sign In' }));

    expect(screen.getByText('Password must be at least 8 characters')).toBeInTheDocument();
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(screen.queryByText('Dashboard route')).not.toBeInTheDocument();
  });

  it('shows inline error when username is whitespace-only and does not call the API', async () => {
    const user = userEvent.setup();
    const fetchSpy = vi.spyOn(globalThis, 'fetch');

    renderLoginRoute();

    await user.type(screen.getByLabelText('Username'), '   ');
    await user.type(screen.getByLabelText('Password'), 'long-enough-pw');
    await user.click(screen.getByRole('button', { name: 'Sign In' }));

    expect(screen.getByText('Username is required')).toBeInTheDocument();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('clears field errors when user types into the field', async () => {
    const user = userEvent.setup();
    const fetchSpy = vi.spyOn(globalThis, 'fetch');

    renderLoginRoute();

    await user.type(screen.getByLabelText('Username'), '   ');
    await user.type(screen.getByLabelText('Password'), 'short');
    await user.click(screen.getByRole('button', { name: 'Sign In' }));
    expect(screen.getByText('Username is required')).toBeInTheDocument();
    expect(screen.getByText('Password must be at least 8 characters')).toBeInTheDocument();

    await user.type(screen.getByLabelText('Username'), 'a');
    expect(screen.queryByText('Username is required')).not.toBeInTheDocument();

    await user.type(screen.getByLabelText('Password'), 'x');
    expect(screen.queryByText('Password must be at least 8 characters')).not.toBeInTheDocument();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('displays an invalid-credentials message and stays on login when login fails', async () => {
    const user = userEvent.setup();
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({ detail: 'Invalid credentials' }),
    } as Response);

    renderLoginRoute();

    await user.type(screen.getByLabelText('Username'), 'admin');
    await user.type(screen.getByLabelText('Password'), 'wrong-password');
    await user.click(screen.getByRole('button', { name: 'Sign In' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid credentials');
    expect(screen.getByRole('button', { name: 'Sign In' })).toBeInTheDocument();
    expect(screen.queryByText('Dashboard route')).not.toBeInTheDocument();
    expect(getToken()).toBeNull();
  });
});
