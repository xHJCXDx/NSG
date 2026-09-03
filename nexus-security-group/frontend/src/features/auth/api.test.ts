import { afterEach, describe, expect, it, vi } from 'vitest';
import { loginWithCredentials } from './api';

describe('loginWithCredentials', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('posts URL-encoded credentials to the auth endpoint and returns the access token', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ access_token: 'jwt-token' }),
    } as Response);

    await expect(loginWithCredentials('admin@example.com', 'p@ss word')).resolves.toBe('jwt-token');

    expect(fetchMock).toHaveBeenCalledWith('/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({ username: 'admin@example.com', password: 'p@ss word' }),
    });
  });

  it('surfaces invalid credentials as a rejected error', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({ detail: 'Invalid credentials' }),
    } as Response);

    await expect(loginWithCredentials('admin', 'wrong-password')).rejects.toThrow('Invalid credentials');
  });
});
