export type RoleName = 'admin' | 'analyst';

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

export interface HealthResponse {
  status: string;
  db: string;
}

export interface ApiErrorResponse {
  detail?: string;
}
