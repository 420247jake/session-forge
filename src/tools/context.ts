import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { PATHS } from "../storage/paths.js";
import { readJson } from "../storage/store.js";
import type {
  UserProfile,
  JournalData,
  DecisionsData,
  DeadEndsData,
  FullContext,
} from "../types.js";

const DEFAULT_PROFILE: UserProfile = {
  name: null,
  preferences: {
    communication_style: "direct",
    emoji_usage: "occasional",
    technical_level: "advanced",
    verbosity: "concise",
  },
  projects: [],
  notes: [],
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

export function registerContextTools(server: McpServer): void {
  server.registerTool(
    "full_context_recall",
    {
      description:
        "Get EVERYTHING - user profile, recent sessions, decisions, dead ends. Use when starting fresh to get full context.",
      inputSchema: {},
    },
    async () => {
      const profile = readJson<UserProfile>(PATHS.profile, {
        ...DEFAULT_PROFILE,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      const journal = readJson<JournalData>(PATHS.journal, { sessions: [] });
      const decisions = readJson<DecisionsData>(PATHS.decisions, {
        decisions: [],
      });
      const deadEnds = readJson<DeadEndsData>(PATHS.deadEnds, {
        dead_ends: [],
      });

      const context: FullContext = {
        user_profile: profile,
        recent_sessions: journal.sessions.slice(-3),
        recent_decisions: decisions.decisions.slice(-10),
        recent_dead_ends: deadEnds.dead_ends.slice(-10),
        retrieved_at: new Date().toISOString(),
      };

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(context, null, 2),
          },
        ],
      };
    }
  );
}
