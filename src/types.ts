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
}

export interface DecisionsData {
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
}

export interface DeadEndsData {
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
}

// ---- Full Context ----

export interface FullContext {
  user_profile: UserProfile;
  recent_sessions: JournalEntry[];
  recent_decisions: DecisionEntry[];
  recent_dead_ends: DeadEndEntry[];
  retrieved_at: string;
}
