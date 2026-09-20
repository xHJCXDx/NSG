export type AlertSeverity = 'info' | 'warning' | 'high' | 'critical';
export type AlertDeliveryStatus = 'pending' | 'sent' | 'delivered' | 'failed';

export interface ApiErrorResponse {
  detail?: string;
}

export interface AlertResponse {
  alert_id: number;
  detection_id: number;
  alert_uuid: string | null;
  alert_title: string;
  alert_message: string;
  alert_severity: AlertSeverity;
  channels_sent: string[] | null;
  slack_channel: string | null;
  created_at: string;
  sent_at: string | null;
  delivery_status: AlertDeliveryStatus;
  acknowledged: boolean;
  acknowledged_by: string | null;
  acknowledged_at: string | null;
  last_updated: string | null;
}

export interface AlertsQuery {
  limit?: number;
  offset?: number;
  delivery_status?: AlertDeliveryStatus;
  acknowledged?: boolean;
}
