import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { PATHS } from "../storage/paths.js";
import { readJson, writeJson } from "../storage/store.js";
import type { UserProfile } from "../types.js";

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

export function registerProfileTools(server: McpServer): void {
  server.registerTool(
    "profile_get",
    {
      description: "Get the current user profile",
      inputSchema: {},
    },
    async () => {
      const profile = readJson<UserProfile>(PATHS.profile, {
        ...DEFAULT_PROFILE,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(profile, null, 2),
          },
        ],
      };
    }
  );

  server.registerTool(
    "profile_update",
    {
      description:
        "Update user profile with preferences, notes, or project info. Call when learning something about the user.",
      inputSchema: {
        name: z.string().optional().describe("User's name if learned"),
        preferences: z
          .record(z.string())
          .optional()
          .describe(
            "Preferences like {communication_style, emoji_usage, technical_level, verbosity}"
          ),
        add_project: z
          .string()
          .optional()
          .describe("Add a project name to user's project list"),
        add_note: z
          .string()
          .optional()
          .describe("Add a note about the user (observations, preferences)"),
      },
    },
    async (params) => {
      const profile = readJson<UserProfile>(PATHS.profile, {
        ...DEFAULT_PROFILE,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      if (params.name) {
        profile.name = params.name;
      }

      if (params.preferences) {
        profile.preferences = { ...profile.preferences, ...params.preferences };
      }

      if (params.add_project && !profile.projects.includes(params.add_project)) {
        profile.projects.push(params.add_project);
      }

      if (params.add_note) {
        profile.notes.push({
          content: params.add_note,
          timestamp: new Date().toISOString(),
        });
        if (profile.notes.length > 50) {
          profile.notes = profile.notes.slice(-50);
        }
      }

      profile.updated_at = new Date().toISOString();
      writeJson(PATHS.profile, profile);

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(profile, null, 2),
          },
        ],
      };
    }
  );
}
