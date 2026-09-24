import type { UserRole } from './types';

export const USERS_ENDPOINT = '/api/users';
export const PERMISSIONS_ENDPOINT = '/api/permissions';
export const PERMISSIONS_ROLE_ENDPOINT = '/api/permissions/roles';

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
      'User creation requires users:write in the JWT. This is presentation-only; the backend remains the authority and may reject this request with 401 or 403.',
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
  permissions: {
    sectionTitle: 'Role Permissions',
    matrix: {
      title: 'Role Permission Matrix',
      description: 'Assign permissions to each role. Admin permissions are locked and cannot be modified.',
      saveLabel: 'Save changes',
      savingLabel: 'Saving...',
      saveSuccess: 'Analyst permissions updated successfully.',
      adminLocked: 'Admin permissions are locked.',
      noChanges: 'No changes to save.',
    },
  },
  errors: {
    createWithoutToken: 'Sign in before creating users.',
    listWithoutToken: 'Sign in before listing users.',
    updateUserWithoutToken: 'Sign in before updating users.',
    deleteUserWithoutToken: 'Sign in before deactivating users.',
    fetchWithoutToken: 'Authentication required to view permissions.',
    updateWithoutToken: 'Authentication required to update permissions.',
    unauthenticated: 'Your session could not be authenticated. Please sign in again.',
    forbidden: 'You do not have permission to create users.',
    conflict: 'A user with that username already exists.',
    validation: 'Please review the user details and try again.',
    createFallback: 'User could not be created. Please try again.',
    listFallback: 'Users could not be loaded.',
    fetchFallback: 'Failed to load permissions.',
    updateFallback: 'Failed to update permissions.',
    updateUserFallback: 'User could not be updated. Please try again.',
    deleteUserFallback: 'User could not be deactivated. Please try again.',
    badRequest: 'Invalid permission configuration.',
    serviceUnavailable: 'User service is unavailable. Please try again.',
  },
} as const;
