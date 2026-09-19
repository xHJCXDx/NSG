import { authFetch } from '../../shared/api/apiClient';
import { HEALTH_ENDPOINT, PERMISSIONS_ENDPOINT, PERMISSIONS_ROLE_ENDPOINT, SETTINGS_COPY } from './contract';
import type { ApiErrorResponse, HealthResponse, PermissionMatrixResponse, RoleName, RolePermissionsResponse, RolePermissionsUpdate } from './types';

export class FetchPermissionsError extends Error {
  constructor(message: string, public readonly status?: number) {
    super(message);
    this.name = 'FetchPermissionsError';
  }
}

export class UpdatePermissionsError extends Error {
  constructor(message: string, public readonly status?: number) {
    super(message);
    this.name = 'UpdatePermissionsError';
  }
}

const fallbackMessageByStatus = (status: number): string => {
  if (status === 401) return SETTINGS_COPY.errors.unauthenticated;
  if (status === 403) return SETTINGS_COPY.errors.forbidden;
  if (status === 400) return SETTINGS_COPY.errors.badRequest;
  if (status === 409) return SETTINGS_COPY.errors.conflict;
  return SETTINGS_COPY.errors.fetchFallback;
};

const readErrorDetail = async (response: Response): Promise<string | undefined> => {
  try {
    const data = (await response.json()) as ApiErrorResponse;
    return typeof data.detail === 'string' && data.detail.trim().length > 0 ? data.detail : undefined;
  } catch {
    return undefined;
  }
};

export async function fetchPermissions(token: string | null): Promise<PermissionMatrixResponse> {
  if (!token) throw new FetchPermissionsError(SETTINGS_COPY.errors.fetchWithoutToken);

  try {
    const response = await authFetch(token, PERMISSIONS_ENDPOINT);
    if (!response.ok) {
      const detail = await readErrorDetail(response);
      throw new FetchPermissionsError(detail ?? fallbackMessageByStatus(response.status), response.status);
    }
    return (await response.json()) as PermissionMatrixResponse;
  } catch (error) {
    if (error instanceof FetchPermissionsError) throw error;
    throw new FetchPermissionsError(SETTINGS_COPY.errors.serviceUnavailable);
  }
}

export async function updateRolePermissions(
  token: string | null,
  role: RoleName,
  payload: RolePermissionsUpdate,
): Promise<RolePermissionsResponse> {
  if (!token) throw new UpdatePermissionsError(SETTINGS_COPY.errors.updateWithoutToken);

  try {
    const response = await authFetch(token, `${PERMISSIONS_ROLE_ENDPOINT}/${role}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      const detail = await readErrorDetail(response);
      throw new UpdatePermissionsError(detail ?? fallbackMessageByStatus(response.status), response.status);
    }
    return (await response.json()) as RolePermissionsResponse;
  } catch (error) {
    if (error instanceof UpdatePermissionsError) throw error;
    throw new UpdatePermissionsError(SETTINGS_COPY.errors.serviceUnavailable);
  }
}

export async function fetchHealth(): Promise<HealthResponse> {
  try {
    const response = await fetch(HEALTH_ENDPOINT);
    if (!response.ok) throw new Error('Health check failed');
    return (await response.json()) as HealthResponse;
  } catch {
    return { status: 'unavailable', db: 'unavailable' };
  }
}
