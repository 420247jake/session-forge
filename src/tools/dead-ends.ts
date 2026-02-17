import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { PATHS } from "../storage/paths.js";
import { readJson, writeJson, searchEntries } from "../storage/store.js";
import type { DeadEndEntry, DeadEndsData } from "../types.js";
import { SCHEMA_VERSION } from "../types.js";

export function registerDeadEndTools(server: McpServer): void {
  server.registerTool(
    "dead_end_record",
    {
      description:
        "Record a debugging dead end so we don't repeat it. Captures what was tried and why it failed.",
      inputSchema: {
        attempted: z.string().describe("What was tried"),
        why_failed: z.string().describe("Why it didn't work"),
        lesson: z
          .string()
          .optional()
          .describe("What to remember for next time"),
        project: z.string().optional().describe("Which project"),
        files_involved: z
          .array(z.string())
          .optional()
          .describe("Files involved"),
        tags: z
          .array(z.string())
          .optional()
          .describe("Tags for searching"),
      },
    },
    async (params) => {
      const data = readJson<DeadEndsData>(PATHS.deadEnds, { dead_ends: [] });

      const entry: DeadEndEntry = {
        timestamp: new Date().toISOString(),
        attempted: params.attempted,
        why_failed: params.why_failed,
        lesson: params.lesson ?? "",
        project: params.project ?? null,
        files_involved: params.files_involved ?? [],
        tags: params.tags ?? [],
      };

      data.dead_ends.push(entry);
      if (data.dead_ends.length > 100) {
        data.dead_ends = data.dead_ends.slice(-100);
      }

      data.schema_version = SCHEMA_VERSION;
      writeJson(PATHS.deadEnds, data);

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
    "dead_end_search",
    {
      description: "Search past dead ends to avoid repeating mistakes",
      inputSchema: {
        query: z.string().describe("Search term"),
        limit: z
          .number()
          .optional()
          .describe("Max results to return (default 20)"),
      },
    },
    async (params) => {
      const data = readJson<DeadEndsData>(PATHS.deadEnds, { dead_ends: [] });

      const results = searchEntries(
        data.dead_ends,
        params.query,
        (d) =>
          [
            d.attempted,
            d.why_failed,
            d.lesson,
            d.project ?? "",
            ...d.tags,
          ].join(" "),
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
