import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { PATHS } from "../storage/paths.js";
import { readJson, writeJson } from "../storage/store.js";
import type { JournalEntry, JournalData } from "../types.js";

export function registerJournalTools(server: McpServer): void {
  server.registerTool(
    "journal_entry",
    {
      description:
        "Record a session journal entry capturing the journey, not just the task. Call at END of meaningful sessions to preserve context.",
      inputSchema: {
        summary: z
          .string()
          .describe(
            "What happened this session (conversational, not just technical)"
          ),
        key_moments: z
          .array(z.string())
          .optional()
          .describe(
            "Significant moments - breakthroughs, realizations, fun exchanges"
          ),
        emotional_context: z
          .string()
          .optional()
          .describe(
            "How did the session feel? User concerns, celebrations, frustrations"
          ),
        breakthroughs: z
          .array(z.string())
          .optional()
          .describe("What clicked or worked unexpectedly well"),
        frustrations: z
          .array(z.string())
          .optional()
          .describe("What was difficult or annoying"),
        collaboration_notes: z
          .string()
          .optional()
          .describe(
            "Notes about working together - user preferences observed, rapport"
          ),
      },
    },
    async (params) => {
      const data = readJson<JournalData>(PATHS.journal, { sessions: [] });

      const entry: JournalEntry = {
        timestamp: new Date().toISOString(),
        session_summary: params.summary,
        key_moments: params.key_moments ?? [],
        emotional_context: params.emotional_context ?? null,
        breakthroughs: params.breakthroughs ?? [],
        frustrations: params.frustrations ?? [],
        collaboration_notes: params.collaboration_notes ?? null,
      };

      data.sessions.push(entry);
      if (data.sessions.length > 100) {
        data.sessions = data.sessions.slice(-100);
      }

      writeJson(PATHS.journal, data);

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(entry, null, 2),
          },
        ],
      };
    }
  );

  server.registerTool(
    "journal_recall",
    {
      description:
        "Retrieve recent session context and journeys. Call at START of sessions to remember the relationship.",
      inputSchema: {
        sessions_count: z
          .number()
          .optional()
          .describe("How many recent sessions to retrieve (default 3)"),
      },
    },
    async (params) => {
      const data = readJson<JournalData>(PATHS.journal, { sessions: [] });
      const count = params.sessions_count ?? 3;
      const recent = data.sessions.slice(-count);

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(recent, null, 2),
          },
        ],
      };
    }
  );
}
