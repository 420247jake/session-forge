import { readJson, writeJson } from "./store.js";
import { PATHS } from "./paths.js";
import { SCHEMA_VERSION } from "../types.js";
import type { DecisionsData, DeadEndsData, JournalData, LinksData, StatsData } from "../types.js";
import { defaultStats } from "./stats.js";

export function migrateIfNeeded(): void {
  migrateDecisions();
  migrateDeadEnds();
  migrateJournal();
  ensureLinks();
  ensureStats();
  console.error("[session-forge] Schema migration check complete");
}

function migrateDecisions(): void {
  const data = readJson<DecisionsData>(PATHS.decisions, { decisions: [] });
  if ((data.schema_version ?? 0) >= SCHEMA_VERSION) return;

  for (const d of data.decisions) {
    if (!d.related_dead_ends) d.related_dead_ends = [];
  }
  data.schema_version = SCHEMA_VERSION;
  writeJson(PATHS.decisions, data);
  console.error(`[session-forge] Migrated decisions.json to schema v${SCHEMA_VERSION}`);
}

function migrateDeadEnds(): void {
  const data = readJson<DeadEndsData>(PATHS.deadEnds, { dead_ends: [] });
  if ((data.schema_version ?? 0) >= SCHEMA_VERSION) return;

  for (const d of data.dead_ends) {
    if (d.led_to_decision === undefined) d.led_to_decision = null;
  }
  data.schema_version = SCHEMA_VERSION;
  writeJson(PATHS.deadEnds, data);
  console.error(`[session-forge] Migrated dead-ends.json to schema v${SCHEMA_VERSION}`);
}

function migrateJournal(): void {
  const data = readJson<JournalData>(PATHS.journal, { sessions: [] });
  if ((data.schema_version ?? 0) >= SCHEMA_VERSION) return;
  data.schema_version = SCHEMA_VERSION;
  writeJson(PATHS.journal, data);
  console.error(`[session-forge] Migrated journal.json to schema v${SCHEMA_VERSION}`);
}

function ensureLinks(): void {
  const data = readJson<LinksData>(PATHS.links, { links: [] });
  if (!data.schema_version) {
    data.schema_version = SCHEMA_VERSION;
    writeJson(PATHS.links, data);
  }
}

function ensureStats(): void {
  const data = readJson<StatsData>(PATHS.stats, {
    schema_version: SCHEMA_VERSION,
    stats: defaultStats(),
  });
  if (!data.schema_version) {
    data.schema_version = SCHEMA_VERSION;
    writeJson(PATHS.stats, data);
  }
}
