export type UserRole = 'admin' | 'analyst';

export type RoleName = UserRole;

export interface CreateUserPayload {
  username: string;
  password: string;
  role: UserRole;
  is_active: boolean;
}

export interface UserResponse {
  user_id: number;
  username: string;
  role: UserRole;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ApiErrorResponse {
  detail?: string;
}

export interface PermissionEntry {
  permission_id: number;
  resource: string;
  action: string;
  permission: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface PermissionMatrixResponse {
  permissions: PermissionEntry[];
  role_permissions: Record<RoleName, string[]>;
}

export interface RolePermissionsUpdate {
  permissions: string[];
}

export interface RolePermissionsResponse {
  role: RoleName;
  permissions: string[];
}
