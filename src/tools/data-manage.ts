import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { PATHS } from "../storage/paths.js";
import { readJson, writeJson } from "../storage/store.js";
import type {
  UserProfile,
  JournalData,
  DecisionsData,
  DeadEndsData,
  SessionCheckpoint,
} from "../types.js";

const STORES = ["journal", "decisions", "dead_ends", "profile"] as const;
type StoreName = (typeof STORES)[number];

function getStorePath(store: StoreName): string {
  switch (store) {
    case "journal":
      return PATHS.journal;
    case "decisions":
      return PATHS.decisions;
    case "dead_ends":
      return PATHS.deadEnds;
    case "profile":
      return PATHS.profile;
  }
}

export function registerDataManageTools(server: McpServer): void {
  server.registerTool(
    "data_manage",
    {
      description:
        "Manage session-forge data. Actions: prune (remove entries older than N days), export (dump all data as JSON), clear (wipe a specific store), stats (show entry counts and file sizes).",
      inputSchema: {
        action: z
          .enum(["prune", "export", "clear", "stats"])
          .describe("Action to perform"),
        store: z
          .enum(["journal", "decisions", "dead_ends", "profile", "all"])
          .optional()
          .describe("Which data store to act on (default: all)"),
        days: z
          .number()
          .optional()
          .describe("For prune: remove entries older than this many days (default: 90)"),
      },
    },
    async (params) => {
      const { action, store = "all", days = 90 } = params;

      switch (action) {
        case "stats": {
          const journal = readJson<JournalData>(PATHS.journal, {
            sessions: [],
          });
          const decisions = readJson<DecisionsData>(PATHS.decisions, {
            decisions: [],
          });
          const deadEnds = readJson<DeadEndsData>(PATHS.deadEnds, {
            dead_ends: [],
          });
          const checkpoint = readJson<SessionCheckpoint | null>(
            PATHS.activeSession,
            null
          );

          const stats = {
            journal_entries: journal.sessions.length,
            decisions: decisions.decisions.length,
            dead_ends: deadEnds.dead_ends.length,
            has_active_session: !!checkpoint,
            schema_versions: {
              journal: (journal as { schema_version?: number }).schema_version ?? "none",
              decisions: (decisions as { schema_version?: number }).schema_version ?? "none",
              dead_ends: (deadEnds as { schema_version?: number }).schema_version ?? "none",
            },
          };

          return {
            content: [
              {
                type: "text" as const,
                text: JSON.stringify(stats, null, 2),
              },
            ],
          };
        }

        case "export": {
          const profile = readJson<UserProfile>(PATHS.profile, {
            name: null,
            preferences: {
              communication_style: "direct",
              emoji_usage: "occasional",
              technical_level: "advanced",
              verbosity: "concise",
            },
            projects: [],
            notes: [],
            created_at: "",
            updated_at: "",
          });
          const journal = readJson<JournalData>(PATHS.journal, {
            sessions: [],
          });
          const decisions = readJson<DecisionsData>(PATHS.decisions, {
            decisions: [],
          });
          const deadEnds = readJson<DeadEndsData>(PATHS.deadEnds, {
            dead_ends: [],
          });

          const exportData = {
            exported_at: new Date().toISOString(),
            profile,
            journal: journal.sessions,
            decisions: decisions.decisions,
            dead_ends: deadEnds.dead_ends,
          };

          return {
            content: [
              {
                type: "text" as const,
                text: JSON.stringify(exportData, null, 2),
              },
            ],
          };
        }

        case "prune": {
          const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
          const results: Record<string, { before: number; after: number }> = {};

          if (store === "all" || store === "journal") {
            const data = readJson<JournalData>(PATHS.journal, {
              sessions: [],
            });
            const before = data.sessions.length;
            data.sessions = data.sessions.filter(
              (e) => new Date(e.timestamp).getTime() > cutoff
            );
            results.journal = { before, after: data.sessions.length };
            writeJson(PATHS.journal, data);
          }

          if (store === "all" || store === "decisions") {
            const data = readJson<DecisionsData>(PATHS.decisions, {
              decisions: [],
            });
            const before = data.decisions.length;
            data.decisions = data.decisions.filter(
              (e) => new Date(e.timestamp).getTime() > cutoff
            );
            results.decisions = { before, after: data.decisions.length };
            writeJson(PATHS.decisions, data);
          }

          if (store === "all" || store === "dead_ends") {
            const data = readJson<DeadEndsData>(PATHS.deadEnds, {
              dead_ends: [],
            });
            const before = data.dead_ends.length;
            data.dead_ends = data.dead_ends.filter(
              (e) => new Date(e.timestamp).getTime() > cutoff
            );
            results.dead_ends = { before, after: data.dead_ends.length };
            writeJson(PATHS.deadEnds, data);
          }

          return {
            content: [
              {
                type: "text" as const,
                text: JSON.stringify(
                  {
                    action: "prune",
                    cutoff_days: days,
                    results,
                  },
                  null,
                  2
                ),
              },
            ],
          };
        }

        case "clear": {
          if (store === "all") {
            writeJson(PATHS.journal, { sessions: [] });
            writeJson(PATHS.decisions, { decisions: [] });
            writeJson(PATHS.deadEnds, { dead_ends: [] });
            return {
              content: [
                {
                  type: "text" as const,
                  text: JSON.stringify({
                    action: "clear",
                    cleared: ["journal", "decisions", "dead_ends"],
                    message:
                      "All stores cleared. Profile was NOT cleared (use store='profile' explicitly).",
                  }, null, 2),
                },
              ],
            };
          }

          if (store === "profile") {
            writeJson(PATHS.profile, {
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
            });
          } else if (store === "journal") {
            writeJson(PATHS.journal, { sessions: [] });
          } else if (store === "decisions") {
            writeJson(PATHS.decisions, { decisions: [] });
          } else if (store === "dead_ends") {
            writeJson(PATHS.deadEnds, { dead_ends: [] });
          }

          return {
            content: [
              {
                type: "text" as const,
                text: JSON.stringify({
                  action: "clear",
                  cleared: [store],
                  message: `${store} store cleared.`,
                }, null, 2),
              },
            ],
          };
        }

        default:
          return {
            content: [
              {
                type: "text" as const,
                text: JSON.stringify({
                  error: `Unknown action: ${action}`,
                }, null, 2),
              },
            ],
          };
      }
    }
  );
}
