export interface HealthResponse {
  status: string;
  db: string;
}

export interface ApiErrorResponse {
  detail?: string;
}
