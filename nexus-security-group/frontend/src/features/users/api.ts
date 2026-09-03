import { createAuthHeaders } from '../../shared/api/authHeaders';
import { USERS_COPY, USERS_ENDPOINT } from './contract';
import type { ApiErrorResponse, CreateUserPayload, UserResponse } from './types';

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
    const response = await fetch(USERS_ENDPOINT, {
      method: 'POST',
      headers: {
        ...createAuthHeaders(token),
        'Content-Type': 'application/json',
      },
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
    const response = await fetch(USERS_ENDPOINT, {
      method: 'GET',
      headers: createAuthHeaders(token),
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
