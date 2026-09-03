import type { UserRole } from './types';

export const USERS_ENDPOINT = '/api/users';

export const USER_ROLE_OPTIONS: UserRole[] = ['analyst', 'admin'];

export const USERS_COPY = {
  page: {
    eyebrow: 'Admin operations',
    title: 'Users',
    description:
      'Create and review backend users through the protected user endpoint. The backend remains authoritative for permissions and persisted user state.',
  },
  authNotice: {
    nonAdmin:
      'Admin visibility here is presentation-only. The backend remains the authority and may reject this request with 401 or 403.',
  },
  form: {
    usernameLabel: 'Username',
    passwordLabel: 'Password',
    roleLabel: 'Role',
    activeLabel: 'Active user',
    submitLabel: 'Create user',
    submittingLabel: 'Creating user...',
  },
  confirmation: {
    eyebrow: 'Session-local confirmation',
    title: 'User created',
    detail: (username: string, role: string) =>
      `Backend confirmed ${username} as ${role}.`,
  },
  directory: {
    title: 'User directory',
    description: 'Admin-only users returned by the backend.',
    loading: 'Loading users...',
    empty: 'No users returned by the backend yet.',
    columns: {
      username: 'Username',
      role: 'Role',
      status: 'Status',
      created: 'Created',
    },
    status: {
      active: 'Active',
      inactive: 'Inactive',
    },
  },
  errors: {
    createWithoutToken: 'Sign in before creating users.',
    listWithoutToken: 'Sign in before listing users.',
    unauthenticated: 'Your session could not be authenticated. Please sign in again.',
    forbidden: 'You do not have permission to create users.',
    conflict: 'A user with that username already exists.',
    validation: 'Please review the user details and try again.',
    createFallback: 'User could not be created. Please try again.',
    listFallback: 'Users could not be loaded.',
    serviceUnavailable: 'User service is unavailable. Please try again.',
  },
} as const;
