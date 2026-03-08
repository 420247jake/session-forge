import { z } from "zod";
import { readFileSync, existsSync } from "node:fs";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { PATHS } from "../storage/paths.js";
import { readJson } from "../storage/store.js";
import { getAllLinks } from "../storage/links.js";
import type {
  UserProfile,
  JournalData,
  DecisionsData,
  DeadEndsData,
  FullContext,
  MemorySyncSuggestion,
} from "../types.js";

const STOP_WORDS = new Set([
  "the", "and", "for", "was", "not", "but", "are", "this", "that",
  "with", "from", "have", "has", "had", "will", "can", "use", "used",
  "using", "when", "then", "than", "also", "into", "only", "must",
  "should", "would", "could", "does", "did", "been", "being",
]);

function extractKeyTerms(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[\s,;:.()\[\]{}'"!?]+/)
    .filter(w => w.length >= 3 && !STOP_WORDS.has(w))
    .filter((w, i, arr) => arr.indexOf(w) === i)
    .slice(0, 8);
}

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
        memory_md_path: z
          .string()
          .optional()
          .describe("Absolute path to MEMORY.md file to include in context and check for sync suggestions"),
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

      const recentDecisions = filteredDecisions.slice(-10);
      const recentDeadEnds = filteredDeadEnds.slice(-10);

      // Get relevant links
      const allLinks = getAllLinks();
      const decTimestamps = new Set(recentDecisions.map(d => d.timestamp));
      const deTimestamps = new Set(recentDeadEnds.map(d => d.timestamp));
      const relevantLinks = allLinks.filter(l =>
        decTimestamps.has(l.from_timestamp) || decTimestamps.has(l.to_timestamp) ||
        deTimestamps.has(l.from_timestamp) || deTimestamps.has(l.to_timestamp)
      );

      // Read MEMORY.md if path provided
      let memoryMd: string | null = null;
      let syncSuggestions: MemorySyncSuggestion[] | undefined;

      if (params.memory_md_path) {
        try {
          if (existsSync(params.memory_md_path)) {
            memoryMd = readFileSync(params.memory_md_path, "utf-8");

            // Generate sync suggestions
            const memLower = memoryMd.toLowerCase();
            const suggestions: MemorySyncSuggestion[] = [];

            for (const dec of filteredDecisions.slice(-20)) {
              const keyTerms = extractKeyTerms(dec.choice);
              const alreadyReflected = keyTerms.some(term => memLower.includes(term));
              if (!alreadyReflected) {
                suggestions.push({
                  type: "decision",
                  summary: dec.choice,
                  detail: dec.reasoning,
                  source_timestamp: dec.timestamp,
                });
              }
            }

            for (const de of filteredDeadEnds.slice(-20)) {
              if (!de.lesson) continue;
              const keyTerms = extractKeyTerms(de.lesson);
              const alreadyReflected = keyTerms.some(term => memLower.includes(term));
              if (!alreadyReflected) {
                suggestions.push({
                  type: "dead_end",
                  summary: `Lesson: ${de.lesson}`,
                  detail: `From failed attempt: ${de.attempted}`,
                  source_timestamp: de.timestamp,
                });
              }
            }

            for (const note of profile.notes.slice(-10)) {
              const keyTerms = extractKeyTerms(note.content);
              const alreadyReflected = keyTerms.some(term => memLower.includes(term));
              if (!alreadyReflected) {
                suggestions.push({
                  type: "preference",
                  summary: note.content,
                  detail: `Observed on ${note.timestamp}`,
                });
              }
            }

            if (suggestions.length > 0) {
              syncSuggestions = suggestions.slice(0, 15);
            }
          }
        } catch {
          // Silently ignore read errors
        }
      }

      const context: FullContext = {
        user_profile: profile,
        recent_sessions: journal.sessions.slice(-3),
        recent_decisions: recentDecisions,
        recent_dead_ends: recentDeadEnds,
        linked_context: relevantLinks.length > 0 ? relevantLinks : undefined,
        memory_md: memoryMd,
        memory_sync_suggestions: syncSuggestions,
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
