export type ThreatLoadStatus = 'idle' | 'loading' | 'success' | 'empty' | 'error';

export type ThreatSeverity = 'low' | 'medium' | 'high' | 'critical' | string;

export type ThreatReviewStatus =
  | 'pending'
  | 'reviewing'
  | 'confirmed'
  | 'false_positive'
  | 'investigating'
  | 'resolved';

export type ThreatRemediationStatus = 'none' | 'in_progress' | 'completed' | 'not_required';

export interface ThreatReviewRequest {
  review_status: ThreatReviewStatus;
  review_notes?: string;
  remediation_status?: ThreatRemediationStatus;
}

export interface RelatedMention {
  id: string;
  text?: string;
  platform?: string;
}

export interface Threat {
  id: string;
  mentionId?: string;
  type: string;
  category?: string | null;
  severity: ThreatSeverity;
  confidence: number;
  riskScore?: number | null;
  detectedAt: string;
  source?: string | null;
  summary?: string;
  evidence?: string[];
  relatedMention?: RelatedMention;
  reviewStatus: ThreatReviewStatus;
  reviewedBy?: string | null;
  reviewedAt?: string | null;
  reviewNotes?: string | null;
  remediationStatus?: ThreatRemediationStatus | null;
}

export interface RawRelatedMention {
  id?: string | number;
  mention_id?: string | number;
  text?: string | null;
  text_content?: string | null;
  platform?: string | null;
  source?: string | null;
}

export interface RawThreat {
  id?: string | number;
  detection_id?: string | number;
  mention_id?: string | number | null;
  threat_type?: string | null;
  type?: string | null;
  threat_category?: string | null;
  category?: string | null;
  criticality_level?: string | null;
  severity?: string | null;
  confidence_score?: number | string | null;
  confidence?: number | string | null;
  risk_score?: number | string | null;
  riskScore?: number | string | null;
  detected_at?: string | null;
  created_at?: string | null;
  source?: string | null;
  contextual_notes?: string | null;
  summary?: string | null;
  evidence?: string | string[] | null;
  matched_keywords?: string[] | null;
  detection_rules_triggered?: string[] | null;
  related_mention?: RawRelatedMention | null;
  mention?: RawRelatedMention | null;
  review_status?: string | null;
  reviewed_by?: string | null;
  reviewed_at?: string | null;
  review_notes?: string | null;
  remediation_status?: string | null;
}

export interface RawThreatsResponse {
  threats?: RawThreat[];
  results?: RawThreat[];
  data?: RawThreat[];
}

export interface ThreatFilters {
  search: string;
  severity: string;
  classification: string;
}

export interface ThreatsQuery {
  page?: number;
  pageSize?: number;
  criticality_level?: string;
}
