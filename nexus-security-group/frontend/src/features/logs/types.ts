export type ExecutionLogStatus = 'success' | 'partial_success' | 'error' | 'warning' | 'timeout';

export interface ApiErrorResponse {
  detail?: string;
}

export interface ExecutionLogResponse {
  log_id: number;
  execution_uuid: string;
  workflow_name: string;
  execution_id: string | number | null;
  status: ExecutionLogStatus;
  mentions_collected: number;
  mentions_processed: number;
  detections_generated: number;
  alerts_generated: number;
  started_at: string | null;
  completed_at: string | null;
  duration_seconds: number | null;
  last_updated: string | null;
}

export interface UserActivityResponse {
  activity_id: number;
  username: string;
  user_role: string;
  activity_type: string;
  activity_description: string;
  related_mention_id: number | null;
  related_detection_id: number | null;
  related_alert_id: number | null;
  ip_address: string | null;
  user_agent: string | null;
  session_id: string | null;
  activity_timestamp: string;
  activity_data: unknown;
}

export interface ExecutionLogsQuery {
  limit?: number;
  offset?: number;
  status?: ExecutionLogStatus;
  workflow_name?: string;
}

export interface UserActivityQuery {
  limit?: number;
  username?: string;
  activity_type?: string;
}
