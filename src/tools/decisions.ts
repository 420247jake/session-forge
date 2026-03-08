import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { PATHS } from "../storage/paths.js";
import { readJson, writeJson } from "../storage/store.js";
import { scoredSearch } from "../storage/search.js";
import { addLink } from "../storage/links.js";
import { incrementStat } from "../storage/stats.js";
import type { DecisionEntry, DecisionsData } from "../types.js";
import { SCHEMA_VERSION } from "../types.js";

export function registerDecisionTools(server: McpServer): void {
  server.registerTool(
    "decision_record",
    {
      description:
        "Record a significant decision made during development. Helps future sessions understand why choices were made.",
      inputSchema: {
        choice: z.string().describe("What was decided"),
        reasoning: z.string().describe("Why this choice was made"),
        alternatives: z
          .array(z.string())
          .optional()
          .describe("What other options existed"),
        outcome: z
          .string()
          .optional()
          .describe("How it turned out (can be updated later)"),
        project: z
          .string()
          .optional()
          .describe("Which project this relates to"),
        tags: z
          .array(z.string())
          .optional()
          .describe("Tags for searching later"),
        related_dead_ends: z
          .array(z.string())
          .optional()
          .describe("Timestamps of dead ends that led to this decision"),
      },
    },
    async (params) => {
      const data = readJson<DecisionsData>(PATHS.decisions, {
        decisions: [],
      });

      const entry: DecisionEntry = {
        timestamp: new Date().toISOString(),
        choice: params.choice,
        alternatives: params.alternatives ?? [],
        reasoning: params.reasoning,
        outcome: params.outcome ?? null,
        project: params.project ?? null,
        tags: params.tags ?? [],
        related_dead_ends: params.related_dead_ends ?? [],
      };

      data.decisions.push(entry);
      if (data.decisions.length > 200) {
        data.decisions = data.decisions.slice(-200);
      }

      data.schema_version = SCHEMA_VERSION;
      writeJson(PATHS.decisions, data);

      if (params.related_dead_ends) {
        for (const deTs of params.related_dead_ends) {
          addLink({
            from_type: "dead_end",
            from_timestamp: deTs,
            to_type: "decision",
            to_timestamp: entry.timestamp,
            reason: "Dead end led to this decision",
          });
        }
      }

      incrementStat("total_decisions_recorded");

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
    "decision_search",
    {
      description:
        "Search past decisions to understand why things are the way they are",
      inputSchema: {
        query: z.string().describe("Search term"),
        limit: z
          .number()
          .optional()
          .describe("Max results to return (default 20)"),
        tags: z
          .array(z.string())
          .optional()
          .describe("Filter by tags"),
        mode: z
          .enum(["and", "or"])
          .optional()
          .describe("Search mode: 'and' requires all words, 'or' matches any (default: or)"),
        fuzzy: z
          .boolean()
          .optional()
          .describe("Enable fuzzy matching for typos (default: true)"),
      },
    },
    async (params) => {
      const data = readJson<DecisionsData>(PATHS.decisions, {
        decisions: [],
      });

      const results = scoredSearch(
        data.decisions,
        params.query,
        (d) => ({
          text: [d.choice, d.reasoning, d.outcome ?? "", ...d.alternatives].join(" "),
          tags: d.tags,
          project: d.project,
          timestamp: d.timestamp,
        }),
        {
          limit: params.limit ?? 20,
          mode: params.mode,
          tags: params.tags,
          fuzzy: params.fuzzy,
        }
      );

      incrementStat("total_searches");
      incrementStat("weekly_searches");
      if (results.length > 0) {
        incrementStat("decisions_referenced");
      }

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(results, null, 2),
          },
        ],
      };
    }
  );
}
