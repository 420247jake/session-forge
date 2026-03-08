// ---- Profile ----

export interface UserPreferences {
  communication_style: string;
  emoji_usage: string;
  technical_level: string;
  verbosity: string;
  [key: string]: string;
}

export interface UserNote {
  content: string;
  timestamp: string;
}

export interface UserProfile {
  name: string | null;
  preferences: UserPreferences;
  projects: string[];
  notes: UserNote[];
  created_at: string;
  updated_at: string;
}

// ---- Schema Version ----

export const SCHEMA_VERSION = 2;

// ---- Journal ----

export interface JournalEntry {
  timestamp: string;
  session_summary: string;
  key_moments: string[];
  emotional_context: string | null;
  breakthroughs: string[];
  frustrations: string[];
  collaboration_notes: string | null;
}

export interface JournalData {
  schema_version?: number;
  sessions: JournalEntry[];
}

// ---- Decisions ----

export interface DecisionEntry {
  timestamp: string;
  choice: string;
  alternatives: string[];
  reasoning: string;
  outcome: string | null;
  project: string | null;
  tags: string[];
  related_dead_ends?: string[];
}

export interface DecisionsData {
  schema_version?: number;
  decisions: DecisionEntry[];
}

// ---- Dead Ends ----

export interface DeadEndEntry {
  timestamp: string;
  attempted: string;
  why_failed: string;
  lesson: string;
  project: string | null;
  files_involved: string[];
  tags: string[];
  led_to_decision?: string | null;
}

export interface DeadEndsData {
  schema_version?: number;
  dead_ends: DeadEndEntry[];
}

// ---- Sessions ----

export interface SessionCheckpoint {
  timestamp: string;
  task: string;
  intent: string;
  status: string;
  files_touched: string[];
  recent_actions: string[];
  next_steps: string[];
  context: Record<string, unknown>;
  tool_call_count: number;
  completed_at?: string;
  summary?: string;
  errors_encountered?: string[];
  key_findings?: string[];
  decisions_made?: string[];
  dead_ends_hit?: string[];
}

// ---- Knowledge Links ----

export interface KnowledgeLink {
  from_type: "decision" | "dead_end" | "journal";
  from_timestamp: string;
  to_type: "decision" | "dead_end" | "journal";
  to_timestamp: string;
  reason: string;
  created_at: string;
}

export interface LinksData {
  schema_version?: number;
  links: KnowledgeLink[];
}

// ---- Usage Stats ----

export interface UsageStats {
  total_checkpoints: number;
  total_sessions_recovered: number;
  total_decisions_recorded: number;
  total_dead_ends_recorded: number;
  total_searches: number;
  dead_ends_avoided: number;
  decisions_referenced: number;
  weekly_dead_ends_avoided: number;
  weekly_searches: number;
  week_start: string;
  last_updated: string;
}

export interface StatsData {
  schema_version?: number;
  stats: UsageStats;
}

// ---- Search ----

export interface SearchOptions {
  mode?: "or" | "and";
  tags?: string[];
  project?: string;
  limit?: number;
  fuzzy?: boolean;
}

export interface ScoredResult<T> {
  entry: T;
  score: number;
  match_reasons: string[];
}

export interface TextFields {
  text: string;
  tags?: string[];
  project?: string | null;
  timestamp?: string;
}

// ---- Memory Sync ----

export interface MemorySyncSuggestion {
  type: "decision" | "dead_end" | "preference";
  summary: string;
  detail: string;
  source_timestamp?: string;
}

// ---- Full Context ----

export interface FullContext {
  user_profile: UserProfile;
  recent_sessions: JournalEntry[];
  recent_decisions: DecisionEntry[];
  recent_dead_ends: DeadEndEntry[];
  linked_context?: KnowledgeLink[];
  memory_md?: string | null;
  memory_sync_suggestions?: MemorySyncSuggestion[];
  retrieved_at: string;
}
