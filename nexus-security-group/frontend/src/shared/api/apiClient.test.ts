import { afterEach, describe, expect, it, vi } from 'vitest';
import { authFetch, AUTH_UNAUTHORIZED_EVENT } from './apiClient';

describe('authFetch', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('adds the bearer token to authenticated requests', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(null, { status: 200 }));

    await authFetch('fake-jwt', '/api/protected', { method: 'PATCH', headers: { 'Content-Type': 'application/json' } });

    expect(globalThis.fetch).toHaveBeenCalledWith('/api/protected', {
      method: 'PATCH',
      headers: {
        Authorization: 'Bearer fake-jwt',
        'Content-Type': 'application/json',
      },
    });
  });

  it('dispatches the unauthorized session event only for 401 responses', async () => {
    const listener = vi.fn();
    window.addEventListener(AUTH_UNAUTHORIZED_EVENT, listener);
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(null, { status: 401 }));

    await authFetch('expired-jwt', '/api/protected');

    expect(listener).toHaveBeenCalledTimes(1);
    window.removeEventListener(AUTH_UNAUTHORIZED_EVENT, listener);
  });

  it('does not dispatch the unauthorized session event for 403 responses', async () => {
    const listener = vi.fn();
    window.addEventListener(AUTH_UNAUTHORIZED_EVENT, listener);
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(null, { status: 403 }));

    await authFetch('valid-but-forbidden-jwt', '/api/protected');

    expect(listener).not.toHaveBeenCalled();
    window.removeEventListener(AUTH_UNAUTHORIZED_EVENT, listener);
  });

  it('does not dispatch the unauthorized session event when the network request fails', async () => {
    const listener = vi.fn();
    window.addEventListener(AUTH_UNAUTHORIZED_EVENT, listener);
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('Failed to fetch'));

    await expect(authFetch('still-valid-jwt', '/api/protected')).rejects.toThrow('Failed to fetch');

    expect(listener).not.toHaveBeenCalled();
    window.removeEventListener(AUTH_UNAUTHORIZED_EVENT, listener);
  });
});
