import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchHealth, fetchPermissions, FetchPermissionsError, updateRolePermissions, UpdatePermissionsError } from './api';
import { HEALTH_ENDPOINT, PERMISSIONS_ENDPOINT, PERMISSIONS_ROLE_ENDPOINT, SETTINGS_COPY } from './contract';
import type { PermissionMatrixResponse, RolePermissionsResponse, RolePermissionsUpdate } from './types';

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

    await expect(fetchPermissions(null)).rejects.toThrow(SETTINGS_COPY.errors.fetchWithoutToken);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('throws with unauthenticated message on 401', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({}),
    } as Response);

    await expect(fetchPermissions('fake-jwt')).rejects.toMatchObject(
      new FetchPermissionsError(SETTINGS_COPY.errors.unauthenticated, 401),
    );
  });

  it('throws with forbidden message on 403', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: false,
      status: 403,
      json: async () => ({}),
    } as Response);

    await expect(fetchPermissions('fake-jwt')).rejects.toMatchObject(
      new FetchPermissionsError(SETTINGS_COPY.errors.forbidden, 403),
    );
  });

  it('throws with serviceUnavailable message on network error', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('offline'));

    await expect(fetchPermissions('fake-jwt')).rejects.toMatchObject(
      new FetchPermissionsError(SETTINGS_COPY.errors.serviceUnavailable),
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
      SETTINGS_COPY.errors.updateWithoutToken,
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
      new UpdatePermissionsError(SETTINGS_COPY.errors.badRequest, 400),
    );
  });

  it('throws with forbidden message on 403', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: false,
      status: 403,
      json: async () => ({}),
    } as Response);

    await expect(updateRolePermissions('fake-jwt', 'analyst', updatePayload)).rejects.toMatchObject(
      new UpdatePermissionsError(SETTINGS_COPY.errors.forbidden, 403),
    );
  });
});

describe('fetchHealth', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('calls the health endpoint and returns the status', async () => {
    const healthResponse = { status: 'healthy', db: 'connected' };
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => healthResponse,
    } as Response);

    await expect(fetchHealth()).resolves.toEqual(healthResponse);

    expect(fetchMock).toHaveBeenCalledWith(HEALTH_ENDPOINT);
  });

  it('returns unavailable fallback on network error instead of throwing', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('offline'));

    await expect(fetchHealth()).resolves.toEqual({ status: 'unavailable', db: 'unavailable' });
  });
});
