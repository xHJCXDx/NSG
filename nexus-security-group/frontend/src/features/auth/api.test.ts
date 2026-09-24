import { afterEach, describe, expect, it, vi } from 'vitest';
import { LoginError, loginWithCredentials } from './api';

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

  it('maps invalid credentials to a login error code', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({ detail: 'Invalid credentials' }),
    } as Response);

    await expect(loginWithCredentials('admin', 'wrong-password')).rejects.toMatchObject(
      new LoginError('invalid_credentials'),
    );
  });

  it('maps rate limits to a login error code', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: false,
      status: 429,
      json: async () => ({ detail: 'Too many attempts' }),
    } as Response);

    await expect(loginWithCredentials('admin', 'wrong-password')).rejects.toMatchObject(new LoginError('rate_limited'));
  });

  it('maps backend failures to a service unavailable login error code', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: false,
      status: 503,
      json: async () => ({ detail: 'Service unavailable' }),
    } as Response);

    await expect(loginWithCredentials('admin', 'password')).rejects.toMatchObject(new LoginError('service_unavailable'));
  });

  it('maps fetch rejections to a network login error code', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('Failed to fetch'));

    await expect(loginWithCredentials('admin', 'password')).rejects.toMatchObject(new LoginError('network'));
  });
});
