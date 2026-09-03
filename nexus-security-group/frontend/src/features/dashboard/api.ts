import { createAuthHeaders } from '../../shared/api/authHeaders';
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
  const res = await fetch(DASHBOARD_ENDPOINT, {
    headers: createAuthHeaders(token),
  });

  if (!res.ok) {
    return null;
  }

  return res.json() as Promise<DashboardSummaryResponse>;
}
