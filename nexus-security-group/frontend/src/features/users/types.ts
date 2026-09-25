export interface Role {
  role_id: number;
  name: string;
  description: string | null;
  is_system: boolean;
  created_at: string;
  permissions: string[];
}

export interface CreateUserPayload {
  username: string;
  password: string;
  role: string;
  is_active: boolean;
}

export interface UpdateUserPayload {
  role?: string;
  is_active?: boolean;
  password?: string;
}

export interface UserResponse {
  user_id: number;
  username: string;
  role: string;
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
  role_permissions: Record<string, string[]>;
}

export interface RolePermissionsUpdate {
  permissions: string[];
}

export interface RolePermissionsResponse {
  role: string;
  permissions: string[];
}

export interface CreateRolePayload {
  name: string;
  description?: string;
}
