export type DocStatus = 'INGESTING' | 'PROCESSING' | 'DRAFT' | 'PUBLISHED' | 'PENDING_DELETE' | 'PURGED';
export type SourceType = 'FILE_UPLOAD' | 'YOUTUBE_LINK' | 'INSTAGRAM_LINK';
export type VoteChoice = 'DELETE' | 'RESTORE';

export interface User {
  id: string;
  username: string;
  display_name: string;
  role: string;
}

export interface SystemStatus {
  status: string;
  llm_connected: boolean;
  llm_provider?: string | null;
}

export interface ActionItem {
  task: string;
  owner?: string | null;
  due?: string | null;
}

export interface ExecutiveSummary {
  summary: string;
  key_decisions: string[];
  action_items: ActionItem[];
  open_questions: string[];
  error?: string;
}

export interface Voter {
  user_id: string;
  choice: VoteChoice;
}

export interface DocumentItem {
  id: string;
  uploader_id: string;
  uploader_name: string;
  title: string;
  agenda_topic: string;
  source_type?: SourceType;
  source_url?: string | null;
  media_path?: string | null;
  used_native_captions?: string | null;
  raw_transcript?: string | null;
  filtered_transcript?: string | null;
  executive_summary?: ExecutiveSummary | null;
  status: DocStatus;
  created_at?: string;
  published_at?: string;
  updated_at?: string;
  delete_votes: number;
  total_users: number;
  voters: Voter[];
}
