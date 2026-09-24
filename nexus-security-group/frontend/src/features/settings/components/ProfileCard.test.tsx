import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthProvider } from '../../auth';
import { LanguageProvider } from '../../../shared/contexts/LanguageContext';
import { ThemeProvider } from '../../../shared/contexts/ThemeContext';
import { setToken, removeToken } from '../../../shared/storage/tokenStorage';
import { ProfileCard } from './ProfileCard';

// ─── helpers ────────────────────────────────────────────────────────────────

const encodePayload = (payload: unknown) =>
  btoa(JSON.stringify(payload)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');

const makeToken = (payload: unknown) => `header.${encodePayload(payload)}.signature`;

const FUTURE_EXP = Math.floor(Date.now() / 1000) + 3600;

function renderCard(tokenPayload?: Record<string, unknown>) {
  const payload = tokenPayload ?? { sub: 'alice', role: 'analyst', exp: FUTURE_EXP };
  setToken(makeToken(payload));

  return render(
    <LanguageProvider>
      <ThemeProvider>
        <AuthProvider>
          <ProfileCard />
        </AuthProvider>
      </ThemeProvider>
    </LanguageProvider>,
  );
}

// ─── setup / teardown ───────────────────────────────────────────────────────

afterEach(() => {
  cleanup();
  removeToken();
  vi.restoreAllMocks();
});

// ─── tests ───────────────────────────────────────────────────────────────────

describe('ProfileCard — user info', () => {
  it('renders username from JWT sub claim', () => {
    renderCard({ sub: 'alice', role: 'analyst', exp: FUTURE_EXP });
    expect(screen.getByText('alice')).toBeInTheDocument();
  });

  it('renders role badge from JWT role claim', () => {
    renderCard({ sub: 'bob', role: 'admin', exp: FUTURE_EXP });
    expect(screen.getByText('admin')).toBeInTheDocument();
  });

  it('shows fallback dash when sub is absent', () => {
    renderCard({ role: 'analyst', exp: FUTURE_EXP });
    expect(screen.getByText('—')).toBeInTheDocument();
  });
});

describe('ProfileCard — password change form', () => {
  it('renders the three password fields and submit button', () => {
    renderCard();
    expect(screen.getByLabelText('Current password')).toBeInTheDocument();
    expect(screen.getByLabelText('New password')).toBeInTheDocument();
    expect(screen.getByLabelText('Confirm new password')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Change password' })).toBeInTheDocument();
  });
});

describe('ProfileCard — client-side validation', () => {
  it('shows required error when submitting empty form', async () => {
    const user = userEvent.setup();
    renderCard();

    await user.click(screen.getByRole('button', { name: 'Change password' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('All fields are required.');
  });

  it('shows too-short error when new password is fewer than 8 chars', async () => {
    const user = userEvent.setup();
    renderCard();

    await user.type(screen.getByLabelText('Current password'), 'current123');
    await user.type(screen.getByLabelText('New password'), 'short');
    await user.type(screen.getByLabelText('Confirm new password'), 'short');
    await user.click(screen.getByRole('button', { name: 'Change password' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'New password must be at least 8 characters.',
    );
  });

  it('shows mismatch error when confirm does not match new password', async () => {
    const user = userEvent.setup();
    renderCard();

    await user.type(screen.getByLabelText('Current password'), 'current123');
    await user.type(screen.getByLabelText('New password'), 'newpassword1');
    await user.type(screen.getByLabelText('Confirm new password'), 'different99');
    await user.click(screen.getByRole('button', { name: 'Change password' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Passwords do not match.');
  });
});

describe('ProfileCard — successful submit', () => {
  beforeEach(() => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(null, { status: 204 }),
    );
  });

  it('clears form and shows success message on 204', async () => {
    const user = userEvent.setup();
    renderCard();

    await user.type(screen.getByLabelText('Current password'), 'current123');
    await user.type(screen.getByLabelText('New password'), 'newpassword1');
    await user.type(screen.getByLabelText('Confirm new password'), 'newpassword1');
    await user.click(screen.getByRole('button', { name: 'Change password' }));

    await waitFor(() => {
      expect(screen.getByRole('status')).toHaveTextContent('Password changed successfully.');
    });

    expect((screen.getByLabelText('Current password') as HTMLInputElement).value).toBe('');
    expect((screen.getByLabelText('New password') as HTMLInputElement).value).toBe('');
    expect((screen.getByLabelText('Confirm new password') as HTMLInputElement).value).toBe('');
  });
});

describe('ProfileCard — failed submit', () => {
  it('shows wrong-current error on 401', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ detail: 'Wrong password' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const user = userEvent.setup();
    renderCard();

    await user.type(screen.getByLabelText('Current password'), 'wrongcurrent');
    await user.type(screen.getByLabelText('New password'), 'newpassword1');
    await user.type(screen.getByLabelText('Confirm new password'), 'newpassword1');
    await user.click(screen.getByRole('button', { name: 'Change password' }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Current password is incorrect.');
    });
  });

  it('shows generic error on non-401 failure', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ detail: 'Internal error' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const user = userEvent.setup();
    renderCard();

    await user.type(screen.getByLabelText('Current password'), 'current123');
    await user.type(screen.getByLabelText('New password'), 'newpassword1');
    await user.type(screen.getByLabelText('Confirm new password'), 'newpassword1');
    await user.click(screen.getByRole('button', { name: 'Change password' }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(
        'Failed to change password. Please try again.',
      );
    });
  });
});
