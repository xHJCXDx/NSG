export const KEYWORDS_ENDPOINT = '/api/keywords';

export const KEYWORD_PRIORITY_MIN = 1;
export const KEYWORD_PRIORITY_MAX = 100;
export const KEYWORD_DEFAULT_PRIORITY = 10;

export const KEYWORDS_COPY = {
  errors: {
    listWithoutToken: 'Sign in before listing keywords.',
    createWithoutToken: 'Sign in before creating keywords.',
    updateWithoutToken: 'Sign in before updating keywords.',
    deleteWithoutToken: 'Sign in before deleting keywords.',
    unauthenticated: 'Your session could not be authenticated. Please sign in again.',
    forbidden: 'You do not have permission to manage keywords.',
    conflict: 'A keyword with that text already exists.',
    validation: 'Please review the keyword details and try again.',
    listFallback: 'Keywords could not be loaded.',
    createFallback: 'Keyword could not be created. Please try again.',
    updateFallback: 'Keyword could not be updated. Please try again.',
    deleteFallback: 'Keyword could not be deleted. Please try again.',
    serviceUnavailable: 'Keyword service is unavailable. Please try again.',
  },
} as const;
