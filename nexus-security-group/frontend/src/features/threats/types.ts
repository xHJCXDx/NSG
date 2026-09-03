export type ThreatLoadStatus = 'idle' | 'loading' | 'success' | 'empty' | 'error';

export type ThreatSeverity = 'low' | 'medium' | 'high' | 'critical' | string;

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
  limit?: number;
}
