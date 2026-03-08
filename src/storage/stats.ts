import { readJson, writeJson } from "./store.js";
import { PATHS } from "./paths.js";
import { SCHEMA_VERSION } from "../types.js";
import type { UsageStats, StatsData } from "../types.js";

function getWeekStart(): string {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day;
  const weekStart = new Date(now.getFullYear(), now.getMonth(), diff);
  return weekStart.toISOString().slice(0, 10);
}

export function defaultStats(): UsageStats {
  return {
    total_checkpoints: 0,
    total_sessions_recovered: 0,
    total_decisions_recorded: 0,
    total_dead_ends_recorded: 0,
    total_searches: 0,
    dead_ends_avoided: 0,
    decisions_referenced: 0,
    weekly_dead_ends_avoided: 0,
    weekly_searches: 0,
    week_start: getWeekStart(),
    last_updated: new Date().toISOString(),
  };
}

export function getStats(): UsageStats {
  const data = readJson<StatsData>(PATHS.stats, {
    schema_version: SCHEMA_VERSION,
    stats: defaultStats(),
  });

  const currentWeek = getWeekStart();
  if (data.stats.week_start !== currentWeek) {
    data.stats.weekly_dead_ends_avoided = 0;
    data.stats.weekly_searches = 0;
    data.stats.week_start = currentWeek;
    writeJson(PATHS.stats, data);
  }

  return data.stats;
}

export function incrementStat(
  field: keyof UsageStats,
  amount: number = 1
): void {
  const data = readJson<StatsData>(PATHS.stats, {
    schema_version: SCHEMA_VERSION,
    stats: defaultStats(),
  });

  const currentWeek = getWeekStart();
  if (data.stats.week_start !== currentWeek) {
    data.stats.weekly_dead_ends_avoided = 0;
    data.stats.weekly_searches = 0;
    data.stats.week_start = currentWeek;
  }

  if (typeof data.stats[field] === "number") {
    (data.stats[field] as number) += amount;
  }
  data.stats.last_updated = new Date().toISOString();
  data.schema_version = SCHEMA_VERSION;
  writeJson(PATHS.stats, data);
}
