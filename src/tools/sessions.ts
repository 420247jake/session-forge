import { z } from "zod";
import { join } from "node:path";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { PATHS } from "../storage/paths.js";
import { readJson, writeJson, deleteJson } from "../storage/store.js";
import type { SessionCheckpoint } from "../types.js";

function archiveCheckpoint(checkpoint: SessionCheckpoint): void {
  const safeName = checkpoint.timestamp.replace(/[:.]/g, "-");
  const archivePath = join(PATHS.sessionHistory, `session_${safeName}.json`);
  writeJson(archivePath, checkpoint);
}

export function registerSessionTools(server: McpServer): void {
  server.registerTool(
    "session_checkpoint",
    {
      description:
        "Save current session state. Call this every 3-5 tool calls to protect against UI crashes. Required: task, intent, next_steps",
      inputSchema: {
        task: z.string().describe("Brief task name"),
        intent: z.string().describe("What you are trying to accomplish"),
        next_steps: z.array(z.string()).describe("Planned next steps"),
        status: z
          .enum(["IN_PROGRESS", "BLOCKED", "WAITING_USER"])
          .optional()
          .describe("Current status"),
        files_touched: z
          .array(z.string())
          .optional()
          .describe("File paths modified"),
        recent_actions: z
          .array(z.string())
          .optional()
          .describe("Last 3-5 actions"),
        context: z
          .record(z.unknown())
          .optional()
          .describe("Any important state/variables"),
        tool_call_count: z
          .number()
          .optional()
          .describe("Approx tool calls so far"),
      },
    },
    async (params) => {
      const checkpoint: SessionCheckpoint = {
        timestamp: new Date().toISOString(),
        task: params.task,
        intent: params.intent,
        status: params.status ?? "IN_PROGRESS",
        files_touched: params.files_touched ?? [],
        recent_actions: params.recent_actions ?? [],
        next_steps: params.next_steps,
        context: params.context ?? {},
        tool_call_count: params.tool_call_count ?? 0,
      };

      writeJson(PATHS.activeSession, checkpoint);

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                success: true,
                message: `Checkpoint saved at ${checkpoint.timestamp}`,
                checkpoint_id: checkpoint.timestamp,
              },
              null,
              2
            ),
          },
        ],
      };
    }
  );

  server.registerTool(
    "session_restore",
    {
      description:
        "Check for interrupted work from a previous session. Call this FIRST at the start of any session.",
      inputSchema: {},
    },
    async () => {
      const checkpoint = readJson<SessionCheckpoint | null>(
        PATHS.activeSession,
        null
      );

      if (!checkpoint) {
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                {
                  has_active_session: false,
                  message: "No active session found. Starting fresh.",
                },
                null,
                2
              ),
            },
          ],
        };
      }

      const ageHours =
        (Date.now() - new Date(checkpoint.timestamp).getTime()) /
        (1000 * 60 * 60);

      const staleHours = Number(process.env.SESSION_FORGE_STALE_HOURS) || 24;
      if (ageHours > staleHours) {
        archiveCheckpoint(checkpoint);
        deleteJson(PATHS.activeSession);

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                {
                  has_active_session: false,
                  message: `Found stale session from ${checkpoint.timestamp} (${Math.round(ageHours)}h ago). Archived it. Starting fresh.`,
                  archived: true,
                },
                null,
                2
              ),
            },
          ],
        };
      }

      const ageMinutes = Math.round(ageHours * 60);

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                has_active_session: true,
                ...checkpoint,
                age_minutes: ageMinutes,
                message: `Found active session: "${checkpoint.task}" (${ageMinutes}m ago, ${checkpoint.tool_call_count} tool calls)`,
              },
              null,
              2
            ),
          },
        ],
      };
    }
  );

  server.registerTool(
    "session_complete",
    {
      description:
        "Mark the current session as complete. Call this when a task is finished.",
      inputSchema: {
        summary: z
          .string()
          .optional()
          .describe("Brief summary of what was accomplished"),
      },
    },
    async (params) => {
      const checkpoint = readJson<SessionCheckpoint | null>(
        PATHS.activeSession,
        null
      );

      if (!checkpoint) {
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                {
                  success: false,
                  message: "No active checkpoint to complete",
                },
                null,
                2
              ),
            },
          ],
        };
      }

      checkpoint.status = "COMPLETED";
      checkpoint.completed_at = new Date().toISOString();
      checkpoint.summary = params.summary ?? "Task completed";

      archiveCheckpoint(checkpoint);
      deleteJson(PATHS.activeSession);

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                success: true,
                message: `Session completed and archived: "${checkpoint.task}"`,
              },
              null,
              2
            ),
          },
        ],
      };
    }
  );
}
