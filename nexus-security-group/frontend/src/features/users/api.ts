import { authFetch } from '../../shared/api/apiClient';
import { PERMISSIONS_ENDPOINT, PERMISSIONS_ROLE_ENDPOINT, USERS_COPY, USERS_ENDPOINT } from './contract';
import type { ApiErrorResponse, CreateUserPayload, PermissionMatrixResponse, RoleName, RolePermissionsResponse, RolePermissionsUpdate, UserResponse } from './types';

export { USERS_ENDPOINT } from './contract';

export class CreateUserError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
  ) {
    super(message);
    this.name = 'CreateUserError';
  }
}

export class ListUsersError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
  ) {
    super(message);
    this.name = 'ListUsersError';
  }
}

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
  if (status === 401) {
    return USERS_COPY.errors.unauthenticated;
  }

  if (status === 403) {
    return USERS_COPY.errors.forbidden;
  }

  if (status === 409) {
    return USERS_COPY.errors.conflict;
  }

  if (status === 422) {
    return USERS_COPY.errors.validation;
  }

  return USERS_COPY.errors.createFallback;
};

const readErrorDetail = async (response: Response): Promise<string | undefined> => {
  try {
    const data = (await response.json()) as ApiErrorResponse;
    return typeof data.detail === 'string' && data.detail.trim().length > 0 ? data.detail : undefined;
  } catch {
    return undefined;
  }
};

export async function createUser(token: string | null, payload: CreateUserPayload): Promise<UserResponse> {
  if (!token) {
    throw new CreateUserError(USERS_COPY.errors.createWithoutToken);
  }

  try {
    const response = await authFetch(token, USERS_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const detail = await readErrorDetail(response);
      throw new CreateUserError(detail ?? fallbackMessageByStatus(response.status), response.status);
    }

    return (await response.json()) as UserResponse;
  } catch (error) {
    if (error instanceof CreateUserError) {
      throw error;
    }

    throw new CreateUserError(USERS_COPY.errors.serviceUnavailable);
  }
}

export async function listUsers(token: string | null): Promise<UserResponse[]> {
  if (!token) {
    throw new ListUsersError(USERS_COPY.errors.listWithoutToken);
  }

  try {
    const response = await authFetch(token, USERS_ENDPOINT, {
      method: 'GET',
    });

    if (!response.ok) {
      const detail = await readErrorDetail(response);
      throw new ListUsersError(detail ?? fallbackMessageByStatus(response.status), response.status);
    }

    return (await response.json()) as UserResponse[];
  } catch (error) {
    if (error instanceof ListUsersError) {
      throw error;
    }

    throw new ListUsersError(USERS_COPY.errors.serviceUnavailable);
  }
}

const permissionsFallbackByStatus = (status: number): string => {
  if (status === 401) return USERS_COPY.errors.unauthenticated;
  if (status === 403) return USERS_COPY.errors.forbidden;
  if (status === 400) return USERS_COPY.errors.badRequest;
  return USERS_COPY.errors.fetchFallback;
};

export async function fetchPermissions(token: string | null): Promise<PermissionMatrixResponse> {
  if (!token) throw new FetchPermissionsError(USERS_COPY.errors.fetchWithoutToken);

  try {
    const response = await authFetch(token, PERMISSIONS_ENDPOINT);
    if (!response.ok) {
      const detail = await readErrorDetail(response);
      throw new FetchPermissionsError(detail ?? permissionsFallbackByStatus(response.status), response.status);
    }
    return (await response.json()) as PermissionMatrixResponse;
  } catch (error) {
    if (error instanceof FetchPermissionsError) throw error;
    throw new FetchPermissionsError(USERS_COPY.errors.serviceUnavailable);
  }
}

export async function updateRolePermissions(
  token: string | null,
  role: RoleName,
  payload: RolePermissionsUpdate,
): Promise<RolePermissionsResponse> {
  if (!token) throw new UpdatePermissionsError(USERS_COPY.errors.updateWithoutToken);

  try {
    const response = await authFetch(token, `${PERMISSIONS_ROLE_ENDPOINT}/${role}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      const detail = await readErrorDetail(response);
      throw new UpdatePermissionsError(detail ?? permissionsFallbackByStatus(response.status), response.status);
    }
    return (await response.json()) as RolePermissionsResponse;
  } catch (error) {
    if (error instanceof UpdatePermissionsError) throw error;
    throw new UpdatePermissionsError(USERS_COPY.errors.serviceUnavailable);
  }
}
