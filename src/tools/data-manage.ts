import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { PATHS } from "../storage/paths.js";
import { readJson, writeJson, searchEntries } from "../storage/store.js";
import type {
  UserProfile,
  JournalData,
  DecisionsData,
  DeadEndsData,
  SessionCheckpoint,
  JournalEntry,
  DecisionEntry,
  DeadEndEntry,
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

  // ---- data_list ----

  const LISTABLE_STORES = ["journal", "decisions", "dead_ends"] as const;
  type ListableStore = (typeof LISTABLE_STORES)[number];

  function truncate(s: string, max: number): string {
    return s.length > max ? s.slice(0, max) + "..." : s;
  }

  function formatDate(ts: string): string {
    const d = new Date(ts);
    return d.toISOString().slice(0, 10);
  }

  function summarizeEntry(
    store: ListableStore,
    entry: JournalEntry | DecisionEntry | DeadEndEntry,
    index: number
  ): { index: number; date: string; summary: string } {
    switch (store) {
      case "journal": {
        const e = entry as JournalEntry;
        return {
          index,
          date: formatDate(e.timestamp),
          summary: truncate(e.session_summary, 80),
        };
      }
      case "decisions": {
        const e = entry as DecisionEntry;
        const proj = e.project ? ` [${e.project}]` : "";
        return {
          index,
          date: formatDate(e.timestamp),
          summary: truncate(e.choice, 80) + proj,
        };
      }
      case "dead_ends": {
        const e = entry as DeadEndEntry;
        const proj = e.project ? ` [${e.project}]` : "";
        return {
          index,
          date: formatDate(e.timestamp),
          summary: truncate(e.attempted, 80) + proj,
        };
      }
    }
  }

  function getEntries(store: ListableStore): (JournalEntry | DecisionEntry | DeadEndEntry)[] {
    switch (store) {
      case "journal":
        return readJson<JournalData>(PATHS.journal, { sessions: [] }).sessions;
      case "decisions":
        return readJson<DecisionsData>(PATHS.decisions, { decisions: [] }).decisions;
      case "dead_ends":
        return readJson<DeadEndsData>(PATHS.deadEnds, { dead_ends: [] }).dead_ends;
    }
  }

  function textExtractor(store: ListableStore) {
    return (entry: JournalEntry | DecisionEntry | DeadEndEntry): string => {
      switch (store) {
        case "journal": {
          const e = entry as JournalEntry;
          return [e.session_summary, ...e.key_moments, ...e.breakthroughs, ...e.frustrations].join(" ");
        }
        case "decisions": {
          const e = entry as DecisionEntry;
          return [e.choice, e.reasoning, e.project ?? "", ...e.tags].join(" ");
        }
        case "dead_ends": {
          const e = entry as DeadEndEntry;
          return [e.attempted, e.why_failed, e.lesson, e.project ?? "", ...e.tags].join(" ");
        }
      }
    };
  }

  server.registerTool(
    "data_list",
    {
      description:
        "List stored entries in a data store. Returns numbered summaries for browsing. Use with data_delete to remove specific entries.",
      inputSchema: {
        store: z
          .enum(["journal", "decisions", "dead_ends"])
          .describe("Which store to list"),
        query: z
          .string()
          .optional()
          .describe("Optional search filter to narrow results"),
        limit: z
          .number()
          .optional()
          .describe("Max entries to return (default 10)"),
      },
    },
    async (params) => {
      const { store, query, limit = 10 } = params;
      let entries = getEntries(store);

      if (query) {
        entries = searchEntries(entries, query, textExtractor(store), limit);
      } else {
        entries = entries.slice(-limit);
      }

      const items = entries.map((entry, i) => summarizeEntry(store, entry, i + 1));

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                store,
                total: getEntries(store).length,
                showing: items.length,
                query: query ?? null,
                entries: items,
              },
              null,
              2
            ),
          },
        ],
      };
    }
  );

  // ---- data_delete ----

  server.registerTool(
    "data_delete",
    {
      description:
        "Delete a specific entry from a data store by its index from data_list. Returns the deleted entry for confirmation.",
      inputSchema: {
        store: z
          .enum(["journal", "decisions", "dead_ends"])
          .describe("Which store to delete from"),
        entry_index: z
          .number()
          .describe("1-based index of the entry to delete (from data_list output)"),
        query: z
          .string()
          .optional()
          .describe("If data_list was filtered by query, provide the same query so indexes match"),
      },
    },
    async (params) => {
      const { store, entry_index, query } = params;

      // Get the full data so we can write back
      const allEntries = getEntries(store);

      // If a query was used, resolve which entries were shown
      let displayedEntries: (JournalEntry | DecisionEntry | DeadEndEntry)[];
      if (query) {
        displayedEntries = searchEntries(allEntries, query, textExtractor(store), 200);
      } else {
        displayedEntries = allEntries.slice(-10);
      }

      if (entry_index < 1 || entry_index > displayedEntries.length) {
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({
                error: `Index ${entry_index} out of range. Valid range: 1-${displayedEntries.length}`,
              }, null, 2),
            },
          ],
        };
      }

      // Find the actual entry to delete
      const targetEntry = displayedEntries[entry_index - 1];
      const targetTimestamp = targetEntry.timestamp;

      // Remove from the full data by matching timestamp
      switch (store) {
        case "journal": {
          const data = readJson<JournalData>(PATHS.journal, { sessions: [] });
          const idx = data.sessions.findIndex((e) => e.timestamp === targetTimestamp);
          if (idx === -1) break;
          const [deleted] = data.sessions.splice(idx, 1);
          writeJson(PATHS.journal, data);
          return {
            content: [
              {
                type: "text" as const,
                text: JSON.stringify({ deleted: deleted, remaining: data.sessions.length }, null, 2),
              },
            ],
          };
        }
        case "decisions": {
          const data = readJson<DecisionsData>(PATHS.decisions, { decisions: [] });
          const idx = data.decisions.findIndex((e) => e.timestamp === targetTimestamp);
          if (idx === -1) break;
          const [deleted] = data.decisions.splice(idx, 1);
          writeJson(PATHS.decisions, data);
          return {
            content: [
              {
                type: "text" as const,
                text: JSON.stringify({ deleted: deleted, remaining: data.decisions.length }, null, 2),
              },
            ],
          };
        }
        case "dead_ends": {
          const data = readJson<DeadEndsData>(PATHS.deadEnds, { dead_ends: [] });
          const idx = data.dead_ends.findIndex((e) => e.timestamp === targetTimestamp);
          if (idx === -1) break;
          const [deleted] = data.dead_ends.splice(idx, 1);
          writeJson(PATHS.deadEnds, data);
          return {
            content: [
              {
                type: "text" as const,
                text: JSON.stringify({ deleted: deleted, remaining: data.dead_ends.length }, null, 2),
              },
            ],
          };
        }
      }

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({ error: "Entry not found in store" }, null, 2),
          },
        ],
      };
    }
  );
}
