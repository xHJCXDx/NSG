import { authFetch } from '../../shared/api/apiClient';
import { CHANGE_PASSWORD_ENDPOINT, HEALTH_ENDPOINT } from './contract';
import type { HealthResponse } from './types';

export async function fetchHealth(): Promise<HealthResponse> {
  try {
    const response = await fetch(HEALTH_ENDPOINT);
    if (!response.ok) throw new Error('Health check failed');
    return (await response.json()) as HealthResponse;
  } catch {
    return { status: 'unavailable', db: 'unavailable' };
  }
}

export async function changeOwnPassword(
  token: string | null,
  currentPassword: string,
  newPassword: string,
): Promise<void> {
  const response = await authFetch(token, CHANGE_PASSWORD_ENDPOINT, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({})) as { detail?: string };
    throw Object.assign(new Error(body.detail ?? 'Password change failed'), { status: response.status });
  }
}
