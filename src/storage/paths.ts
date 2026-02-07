import { homedir } from "node:os";
import { join } from "node:path";

function getBaseDir(): string {
  if (process.env.SESSION_FORGE_DIR) {
    return process.env.SESSION_FORGE_DIR;
  }
  if (process.platform === "win32" && process.env.APPDATA) {
    return join(process.env.APPDATA, "session-forge");
  }
  return join(homedir(), ".session-forge");
}

const base = getBaseDir();

export const PATHS = {
  base,
  profile: join(base, "profile.json"),
  journal: join(base, "journal.json"),
  decisions: join(base, "decisions.json"),
  deadEnds: join(base, "dead-ends.json"),
  sessions: join(base, "sessions"),
  activeSession: join(base, "sessions", "active.json"),
  sessionHistory: join(base, "sessions", "history"),
} as const;
