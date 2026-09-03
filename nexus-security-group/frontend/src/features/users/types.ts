export type UserRole = 'admin' | 'analyst';

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
