export const DASHBOARD_ENDPOINT = '/api/dashboard/summary';

export const DASHBOARD_COPY = {
  page: {
    title: 'Overview',
    description: 'Real-time security and system metrics.',
  },
  kpi: {
    totalThreats: 'Total Threats',
    pendingThreats: 'Pending Threats',
    totalAlerts: 'Total Alerts',
    unacknowledgedAlerts: 'Unacknowledged Alerts',
    activeKeywords: 'Active Keywords',
    executionLogs: 'Execution Logs',
    activityCount: 'Activity Count',
  },
  chart: {
    title: 'Security Summary',
    noData: 'No data available',
  },
} as const;
