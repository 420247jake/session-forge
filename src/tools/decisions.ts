import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { PATHS } from "../storage/paths.js";
import { readJson, writeJson, searchEntries } from "../storage/store.js";
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
      };

      data.decisions.push(entry);
      if (data.decisions.length > 200) {
        data.decisions = data.decisions.slice(-200);
      }

      data.schema_version = SCHEMA_VERSION;
      writeJson(PATHS.decisions, data);

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
      },
    },
    async (params) => {
      const data = readJson<DecisionsData>(PATHS.decisions, {
        decisions: [],
      });

      const results = searchEntries(
        data.decisions,
        params.query,
        (d) => [d.choice, d.reasoning, d.project ?? "", ...d.tags].join(" "),
        params.limit ?? 20
      );

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
