import { HEALTH_ENDPOINT } from './contract';
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
