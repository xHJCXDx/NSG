export const EXECUTION_LOGS_ENDPOINT = '/api/logs';
export const USER_ACTIVITY_ENDPOINT = '/api/activity';

export const LOGS_DEFAULT_LIMIT = 25;
export const LOGS_LIMIT_MIN = 1;
export const LOGS_LIMIT_MAX = 100;
export const USER_ACTIVITY_DEFAULT_LIMIT = 25;

export const EXECUTION_LOG_STATUSES = ['success', 'partial_success', 'error', 'warning', 'timeout'] as const;

export const LOGS_COPY = {
  errors: {
    executionWithoutToken: 'Sign in before listing execution logs.',
    activityWithoutToken: 'Sign in before listing user activity.',
    unauthenticated: 'Your session could not be authenticated. Please sign in again.',
    forbidden: 'You do not have permission to read logs.',
    validation: 'Please review the log filters and try again.',
    executionFallback: 'Execution logs could not be loaded.',
    activityFallback: 'User activity could not be loaded.',
    serviceUnavailable: 'Logs service is unavailable. Please try again.',
  },
} as const;
