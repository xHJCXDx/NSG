export const ALERTS_ENDPOINT = '/api/alerts';

export const ALERTS_DEFAULT_LIMIT = 25;
export const ALERTS_LIMIT_MIN = 1;
export const ALERTS_LIMIT_MAX = 100;

export const ALERT_DELIVERY_STATUSES = ['pending', 'sent', 'delivered', 'failed'] as const;

export const ALERTS_COPY = {
  errors: {
    listWithoutToken: 'Sign in before listing alerts.',
    acknowledgeWithoutToken: 'Sign in before acknowledging alerts.',
    unauthenticated: 'Your session could not be authenticated. Please sign in again.',
    forbidden: 'You do not have permission to manage alerts.',
    notFound: 'Alert not found.',
    validation: 'Please review the alert filters and try again.',
    listFallback: 'Alerts could not be loaded.',
    acknowledgeFallback: 'Alert could not be acknowledged. Please try again.',
    serviceUnavailable: 'Alert service is unavailable. Please try again.',
  },
} as const;
