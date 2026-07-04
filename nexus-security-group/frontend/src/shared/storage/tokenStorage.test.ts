import { afterEach, describe, expect, it } from 'vitest';
import { createAuthHeaders } from '../api/authHeaders';
import { getToken, removeToken, setToken } from './tokenStorage';

describe('token storage and auth headers', () => {
  afterEach(() => {
    localStorage.clear();
  });

  it('preserves the localStorage token key contract', () => {
    setToken('fake-jwt');

    expect(localStorage.getItem('token')).toBe('fake-jwt');
    expect(getToken()).toBe('fake-jwt');

    removeToken();

    expect(localStorage.getItem('token')).toBeNull();
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
