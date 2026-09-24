export interface KeywordResponse {
  keyword_id: number;
  keyword_text: string;
  keyword_type?: string | null;
  keyword_category?: string | null;
  keyword_weight?: number | null;
  is_active: boolean;
  is_regex: boolean;
  case_sensitive: boolean;
  added_by?: string | null;
  added_at?: string | null;
  last_match_at?: string | null;
  match_count?: number | null;
  false_positive_count?: number | null;
  true_positive_count?: number | null;
  trigger_immediate_alert: boolean;
  min_matches_for_alert?: number | null;
  description?: string | null;
}

export interface KeywordCreatePayload {
  keyword_text: string;
  keyword_type?: string;
  keyword_category?: string;
  keyword_weight?: number;
  is_active?: boolean;
  is_regex?: boolean;
  case_sensitive?: boolean;
  added_by?: string;
  trigger_immediate_alert?: boolean;
  min_matches_for_alert?: number;
  description?: string;
}

export type KeywordUpdatePayload = Partial<KeywordCreatePayload>;

export interface ApiErrorResponse {
  detail?: string;
}
