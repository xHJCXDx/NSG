import { authFetch } from '../../shared/api/apiClient';
import { EXECUTION_LOGS_ENDPOINT, LOGS_COPY, USER_ACTIVITY_ENDPOINT } from './contract';
import type { ApiErrorResponse, ExecutionLogResponse, ExecutionLogsQuery, UserActivityQuery, UserActivityResponse } from './types';

export { EXECUTION_LOGS_ENDPOINT, USER_ACTIVITY_ENDPOINT } from './contract';

export class ListExecutionLogsError extends Error {
  constructor(message: string, public readonly status?: number) {
    super(message);
    this.name = 'ListExecutionLogsError';
  }
}

export class ListUserActivityError extends Error {
  constructor(message: string, public readonly status?: number) {
    super(message);
    this.name = 'ListUserActivityError';
  }
}

const readErrorDetail = async (response: Response): Promise<string | undefined> => {
  try {
    const data = (await response.json()) as ApiErrorResponse;
    return typeof data.detail === 'string' && data.detail.trim().length > 0 ? data.detail : undefined;
  } catch {
    return undefined;
  }
};

const fallbackMessageByStatus = (status: number, fallback: string): string => {
  if (status === 401) return LOGS_COPY.errors.unauthenticated;
  if (status === 403) return LOGS_COPY.errors.forbidden;
  if (status === 422) return LOGS_COPY.errors.validation;
  return fallback;
};

const buildExecutionLogsUrl = (query: ExecutionLogsQuery = {}) => {
  const params = new URLSearchParams();
  params.set('limit', String(query.limit ?? 50));
  params.set('offset', String(query.offset ?? 0));

  if (query.status) params.set('status', query.status);
  if (query.workflow_name?.trim()) params.set('workflow_name', query.workflow_name.trim());

  return `${EXECUTION_LOGS_ENDPOINT}?${params.toString()}`;
};

const buildUserActivityUrl = (query: UserActivityQuery = {}) => {
  const params = new URLSearchParams();
  params.set('limit', String(query.limit ?? 50));

  if (query.username?.trim()) params.set('username', query.username.trim());
  if (query.activity_type?.trim()) params.set('activity_type', query.activity_type.trim());

  return `${USER_ACTIVITY_ENDPOINT}?${params.toString()}`;
};

export async function listExecutionLogs(token: string | null, query: ExecutionLogsQuery = {}): Promise<ExecutionLogResponse[]> {
  if (!token) throw new ListExecutionLogsError(LOGS_COPY.errors.executionWithoutToken);

  try {
    const response = await authFetch(token, buildExecutionLogsUrl(query), { method: 'GET' });
    if (!response.ok) {
      const detail = await readErrorDetail(response);
      throw new ListExecutionLogsError(detail ?? fallbackMessageByStatus(response.status, LOGS_COPY.errors.executionFallback), response.status);
    }

    return (await response.json()) as ExecutionLogResponse[];
  } catch (error) {
    if (error instanceof ListExecutionLogsError) throw error;
    throw new ListExecutionLogsError(LOGS_COPY.errors.serviceUnavailable);
  }
}

export async function listUserActivity(token: string | null, query: UserActivityQuery = {}): Promise<UserActivityResponse[]> {
  if (!token) throw new ListUserActivityError(LOGS_COPY.errors.activityWithoutToken);

  try {
    const response = await authFetch(token, buildUserActivityUrl(query), { method: 'GET' });
    if (!response.ok) {
      const detail = await readErrorDetail(response);
      throw new ListUserActivityError(detail ?? fallbackMessageByStatus(response.status, LOGS_COPY.errors.activityFallback), response.status);
    }

    return (await response.json()) as UserActivityResponse[];
  } catch (error) {
    if (error instanceof ListUserActivityError) throw error;
    throw new ListUserActivityError(LOGS_COPY.errors.serviceUnavailable);
  }
}
