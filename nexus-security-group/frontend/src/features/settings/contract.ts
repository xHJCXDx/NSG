export const PERMISSIONS_ENDPOINT = '/api/permissions';
export const PERMISSIONS_ROLE_ENDPOINT = '/api/permissions/roles';
export const HEALTH_ENDPOINT = '/api/health';

export const SETTINGS_COPY = {
  page: {
    eyebrow: 'Administration',
    title: 'Settings',
    description: 'Manage role-based access control and view system status. Only administrators can modify permissions.',
  },
  matrix: {
    title: 'Role Permission Matrix',
    description: 'Assign permissions to each role. Admin permissions are locked and cannot be modified.',
    saveLabel: 'Save changes',
    savingLabel: 'Saving...',
    saveSuccess: 'Analyst permissions updated successfully.',
    adminLocked: 'Admin permissions are locked.',
    noChanges: 'No changes to save.',
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
  errors: {
    fetchWithoutToken: 'Authentication required to view permissions.',
    updateWithoutToken: 'Authentication required to update permissions.',
    unauthenticated: 'Your session has expired. Please log in again.',
    forbidden: 'You do not have permission to perform this action.',
    badRequest: 'Invalid permission configuration.',
    conflict: 'Permission conflict detected.',
    fetchFallback: 'Failed to load permissions.',
    updateFallback: 'Failed to update permissions.',
    serviceUnavailable: 'Service temporarily unavailable. Please try again.',
  },
} as const;
