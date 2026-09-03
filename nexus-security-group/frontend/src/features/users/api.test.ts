import { afterEach, describe, expect, it, vi } from 'vitest';
import { createUser, CreateUserError, listUsers, ListUsersError } from './api';
import { USERS_ENDPOINT } from './contract';
import type { CreateUserPayload } from './types';

const payload: CreateUserPayload = {
  username: 'alice',
  password: 'secret',
  role: 'analyst',
  is_active: true,
};

describe('createUser', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('posts the payload with JSON and auth headers and returns the backend response', async () => {
    const response = {
      user_id: 1,
      username: 'alice',
      role: 'analyst',
      is_active: true,
      created_at: '2026-07-15T10:00:00Z',
      updated_at: '2026-07-15T10:00:00Z',
    };
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue({ ok: true, json: async () => response } as Response);

    await expect(createUser('fake-jwt', payload)).resolves.toEqual(response);

    expect(fetchMock).toHaveBeenCalledWith(USERS_ENDPOINT, {
      method: 'POST',
      headers: { Authorization: 'Bearer fake-jwt', 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  });

  it('fails before calling fetch when the token is missing', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch');

    await expect(createUser(null, payload)).rejects.toThrow('Sign in before creating users.');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each([
    [401, 'Session expired'],
    [403, 'Admins only'],
    [409, 'Username already exists'],
    [422, 'Password is too short'],
  ])('maps backend detail for %i responses', async (status, detail) => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: false,
      status,
      json: async () => ({ detail }),
    } as Response);

    await expect(createUser('fake-jwt', payload)).rejects.toMatchObject(new CreateUserError(detail, status));
  });

  it('maps server and network failures to actionable errors', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({ ok: false, status: 500, json: async () => ({}) } as Response);
    await expect(createUser('fake-jwt', payload)).rejects.toThrow('User could not be created. Please try again.');

    vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(new Error('offline'));
    await expect(createUser('fake-jwt', payload)).rejects.toThrow('User service is unavailable. Please try again.');
  });
});

describe('listUsers', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('loads users with auth headers', async () => {
    const response = [
      {
        user_id: 1,
        username: 'alice',
        role: 'analyst',
        is_active: true,
        created_at: '2026-07-15T10:00:00Z',
        updated_at: '2026-07-15T10:00:00Z',
      },
    ];
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue({ ok: true, json: async () => response } as Response);

    await expect(listUsers('fake-jwt')).resolves.toEqual(response);

    expect(fetchMock).toHaveBeenCalledWith(USERS_ENDPOINT, {
      method: 'GET',
      headers: { Authorization: 'Bearer fake-jwt' },
    });
  });

  it('fails before calling fetch when the token is missing', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch');

    await expect(listUsers(null)).rejects.toThrow('Sign in before listing users.');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('maps backend detail and network failures to list errors', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({ ok: false, status: 403, json: async () => ({ detail: 'Admins only' }) } as Response);
    await expect(listUsers('fake-jwt')).rejects.toMatchObject(new ListUsersError('Admins only', 403));

    vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(new Error('offline'));
    await expect(listUsers('fake-jwt')).rejects.toThrow('User service is unavailable. Please try again.');
  });
});
