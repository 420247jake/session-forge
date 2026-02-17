import { z } from "zod";
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
      inputSchema: {
        project: z
          .string()
          .optional()
          .describe("Filter decisions and dead ends by project name"),
      },
    },
    async (params) => {
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

      let filteredDecisions = decisions.decisions;
      let filteredDeadEnds = deadEnds.dead_ends;

      if (params.project) {
        const proj = params.project.toLowerCase();
        filteredDecisions = filteredDecisions.filter(
          (d) => d.project?.toLowerCase().includes(proj)
        );
        filteredDeadEnds = filteredDeadEnds.filter(
          (d) => d.project?.toLowerCase().includes(proj)
        );
      }

      const context: FullContext = {
        user_profile: profile,
        recent_sessions: journal.sessions.slice(-3),
        recent_decisions: filteredDecisions.slice(-10),
        recent_dead_ends: filteredDeadEnds.slice(-10),
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
