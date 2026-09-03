export type MentionLoadStatus = 'idle' | 'loading' | 'success' | 'empty' | 'error';

export type MentionPlatform =
  | 'twitter'
  | 'reddit'
  | 'telegram'
  | 'discord'
  | 'github'
  | 'exploit-db'
  | 'other'
  | string;

export interface Mention {
  id: string;
  platform: MentionPlatform;
  text: string;
  createdAt: string;
  collectedAt?: string;
  author?: string | null;
  status?: 'pending' | 'processed' | 'failed' | string;
  sentiment?: 'positive' | 'neutral' | 'negative' | string;
  sourceUrl?: string;
}

export interface RawMention {
  id?: string | number;
  mention_id?: string | number;
  platform?: string | null;
  source?: string | null;
  text?: string | null;
  text_content?: string | null;
  content?: string | null;
  summary?: string | null;
  created_at?: string | null;
  collected_at?: string | null;
  author?: string | null;
  author_username?: string | null;
  status?: string | null;
  sentiment?: string | null;
  source_url?: string | null;
  url?: string | null;
}

export interface RawMentionsResponse {
  mentions?: RawMention[];
  results?: RawMention[];
  data?: RawMention[];
}

export interface MentionFilters {
  search: string;
  platform: string;
}

export interface MentionsQuery {
  limit?: number;
}
