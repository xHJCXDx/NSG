import { createAuthHeaders } from '../../shared/api/authHeaders';

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
  const res = await fetch('/api/dashboard/summary', {
    headers: createAuthHeaders(token),
  });

  if (!res.ok) {
    return null;
  }

  return res.json() as Promise<DashboardSummaryResponse>;
}
