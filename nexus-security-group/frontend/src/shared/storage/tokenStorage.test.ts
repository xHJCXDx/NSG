import { afterEach, describe, expect, it } from 'vitest';
import { createAuthHeaders } from '../api/authHeaders';
import { getToken, removeToken, setToken, TOKEN_STORAGE_KEY } from './tokenStorage';

describe('token storage and auth headers', () => {
  afterEach(() => {
    localStorage.clear();
  });

  it('preserves the localStorage token key contract', () => {
    setToken('fake-jwt');

    expect(localStorage.getItem(TOKEN_STORAGE_KEY)).toBe('fake-jwt');
    expect(getToken()).toBe('fake-jwt');

    removeToken();

    expect(localStorage.getItem('nsg:auth:token')).toBeNull();
    expect(getToken()).toBeNull();
  });

  it('preserves the bearer Authorization header contract', () => {
    expect(createAuthHeaders('fake-jwt')).toEqual({
      Authorization: 'Bearer fake-jwt',
    });
  });

  it('omits the Authorization header when no token is available', () => {
    expect(createAuthHeaders(null)).toEqual({});
  });
});
