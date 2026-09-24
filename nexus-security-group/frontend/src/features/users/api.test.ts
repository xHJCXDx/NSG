import { afterEach, describe, expect, it, vi } from 'vitest';
import { createUser, CreateUserError, deleteUser, DeleteUserError, fetchPermissions, FetchPermissionsError, listUsers, ListUsersError, updateRolePermissions, UpdatePermissionsError, updateUser, UpdateUserError } from './api';
import { PERMISSIONS_ENDPOINT, PERMISSIONS_ROLE_ENDPOINT, USERS_COPY, USERS_ENDPOINT } from './contract';
import type { CreateUserPayload, PermissionMatrixResponse, RolePermissionsResponse, RolePermissionsUpdate, UpdateUserPayload } from './types';

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

describe('updateUser', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('patches a user with partial JSON payload and auth headers', async () => {
    const updatePayload: UpdateUserPayload = { role: 'admin', is_active: false, password: 'new-secret' };
    const response = {
      user_id: 2,
      username: 'bob',
      role: 'admin',
      is_active: false,
      created_at: '2026-07-16T10:00:00Z',
      updated_at: '2026-07-16T11:00:00Z',
    };
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue({ ok: true, json: async () => response } as Response);

    await expect(updateUser('fake-jwt', 2, updatePayload)).resolves.toEqual(response);

    expect(fetchMock).toHaveBeenCalledWith(`${USERS_ENDPOINT}/2`, {
      method: 'PATCH',
      headers: { Authorization: 'Bearer fake-jwt', 'Content-Type': 'application/json' },
      body: JSON.stringify(updatePayload),
    });
  });

  it('fails before calling fetch when the token is missing', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch');

    await expect(updateUser(null, 2, { role: 'analyst' })).rejects.toThrow(USERS_COPY.errors.updateUserWithoutToken);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('maps backend detail and network failures to update errors', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({ ok: false, status: 403, json: async () => ({ detail: 'Forbidden' }) } as Response);
    await expect(updateUser('fake-jwt', 2, { is_active: false })).rejects.toMatchObject(new UpdateUserError('Forbidden', 403));

    vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(new Error('offline'));
    await expect(updateUser('fake-jwt', 2, { role: 'admin' })).rejects.toThrow(USERS_COPY.errors.serviceUnavailable);
  });
});

describe('deleteUser', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('calls DELETE with auth headers and returns the backend soft-deleted user', async () => {
    const response = {
      user_id: 2,
      username: 'bob',
      role: 'analyst',
      is_active: false,
      created_at: '2026-07-16T10:00:00Z',
      updated_at: '2026-07-16T11:00:00Z',
    };
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue({ ok: true, json: async () => response } as Response);

    await expect(deleteUser('fake-jwt', 2)).resolves.toEqual(response);

    expect(fetchMock).toHaveBeenCalledWith(`${USERS_ENDPOINT}/2`, {
      method: 'DELETE',
      headers: { Authorization: 'Bearer fake-jwt' },
    });
  });

  it('fails before calling fetch when the token is missing', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch');

    await expect(deleteUser(null, 2)).rejects.toThrow(USERS_COPY.errors.deleteUserWithoutToken);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('maps backend detail and network failures to delete errors', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({ ok: false, status: 409, json: async () => ({ detail: 'Cannot deactivate the last active admin user' }) } as Response);
    await expect(deleteUser('fake-jwt', 2)).rejects.toMatchObject(new DeleteUserError('Cannot deactivate the last active admin user', 409));

    vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(new Error('offline'));
    await expect(deleteUser('fake-jwt', 2)).rejects.toThrow(USERS_COPY.errors.serviceUnavailable);
  });
});

const permissionMatrixFixture: PermissionMatrixResponse = {
  permissions: [
    {
      permission_id: 1,
      resource: 'alerts',
      action: 'read',
      permission: 'alerts:read',
      description: 'View alerts',
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
    },
  ],
  role_permissions: {
    admin: ['alerts:read', 'alerts:write'],
    analyst: ['alerts:read'],
  },
};

const rolePermissionsFixture: RolePermissionsResponse = {
  role: 'analyst',
  permissions: ['alerts:read'],
};

const updatePayload: RolePermissionsUpdate = {
  permissions: ['alerts:read'],
};

describe('fetchPermissions', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('calls the permissions endpoint with auth header and returns the matrix', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => permissionMatrixFixture,
    } as Response);

    await expect(fetchPermissions('fake-jwt')).resolves.toEqual(permissionMatrixFixture);

    expect(fetchMock).toHaveBeenCalledWith(PERMISSIONS_ENDPOINT, {
      headers: { Authorization: 'Bearer fake-jwt' },
    });
  });

  it('throws FetchPermissionsError before calling fetch when token is null', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch');

    await expect(fetchPermissions(null)).rejects.toThrow(USERS_COPY.errors.fetchWithoutToken);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('throws with unauthenticated message on 401', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({}),
    } as Response);

    await expect(fetchPermissions('fake-jwt')).rejects.toMatchObject(
      new FetchPermissionsError(USERS_COPY.errors.unauthenticated, 401),
    );
  });

  it('throws with forbidden message on 403', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: false,
      status: 403,
      json: async () => ({}),
    } as Response);

    await expect(fetchPermissions('fake-jwt')).rejects.toMatchObject(
      new FetchPermissionsError(USERS_COPY.errors.forbidden, 403),
    );
  });

  it('throws with serviceUnavailable message on network error', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('offline'));

    await expect(fetchPermissions('fake-jwt')).rejects.toMatchObject(
      new FetchPermissionsError(USERS_COPY.errors.serviceUnavailable),
    );
  });
});

describe('updateRolePermissions', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('sends PUT with JSON body and auth header, returns the updated role permissions', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => rolePermissionsFixture,
    } as Response);

    await expect(updateRolePermissions('fake-jwt', 'analyst', updatePayload)).resolves.toEqual(rolePermissionsFixture);

    expect(fetchMock).toHaveBeenCalledWith(`${PERMISSIONS_ROLE_ENDPOINT}/analyst`, {
      method: 'PUT',
      headers: {
        Authorization: 'Bearer fake-jwt',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updatePayload),
    });
  });

  it('throws UpdatePermissionsError before calling fetch when token is null', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch');

    await expect(updateRolePermissions(null, 'analyst', updatePayload)).rejects.toThrow(
      USERS_COPY.errors.updateWithoutToken,
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('throws with detail from response body on 400', async () => {
    const detail = 'Invalid permission configuration.';
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({ detail }),
    } as Response);

    await expect(updateRolePermissions('fake-jwt', 'analyst', updatePayload)).rejects.toMatchObject(
      new UpdatePermissionsError(detail, 400),
    );
  });

  it('falls back to badRequest message on 400 when body has no detail', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({}),
    } as Response);

    await expect(updateRolePermissions('fake-jwt', 'analyst', updatePayload)).rejects.toMatchObject(
      new UpdatePermissionsError(USERS_COPY.errors.badRequest, 400),
    );
  });

  it('throws with forbidden message on 403', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: false,
      status: 403,
      json: async () => ({}),
    } as Response);

    await expect(updateRolePermissions('fake-jwt', 'analyst', updatePayload)).rejects.toMatchObject(
      new UpdatePermissionsError(USERS_COPY.errors.forbidden, 403),
    );
  });
});
