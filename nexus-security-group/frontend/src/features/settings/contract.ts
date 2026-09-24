export const HEALTH_ENDPOINT = '/api/health';
export const CHANGE_PASSWORD_ENDPOINT = '/api/users/me/password';

export const SETTINGS_COPY = {
  page: {
    eyebrow: 'Administration',
    title: 'Settings',
    description: 'View system status. Permission management has moved to the Users page.',
  },
  systemInfo: {
    title: 'System Information',
    description: 'Runtime and connectivity status.',
    version: 'Version',
    environment: 'Environment',
    apiStatus: 'API Status',
    database: 'Database',
    healthy: 'Healthy',
    connected: 'Connected',
    unavailable: 'Unavailable',
  },
} as const;
