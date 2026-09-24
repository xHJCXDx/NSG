import { authFetch } from '../../shared/api/apiClient';
import { DASHBOARD_ENDPOINT } from './contract';

export interface DashboardSummaryResponse {
  total_threats: number;
  pending_threats: number;
  total_alerts: number;
  unacknowledged_alerts: number;
  active_keywords: number;
  execution_logs_count: number;
  activity_count: number;
}

export async function fetchDashboardSummary(token: string | null) {
  const res = await authFetch(token, DASHBOARD_ENDPOINT);

  if (!res.ok) {
    throw new Error(`Failed to fetch dashboard summary: ${res.status}`);
  }

  return res.json() as Promise<DashboardSummaryResponse>;
}
