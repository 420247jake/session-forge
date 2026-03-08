import { readJson, writeJson } from "./store.js";
import { PATHS } from "./paths.js";
import { SCHEMA_VERSION } from "../types.js";
import type {
  KnowledgeLink, LinksData, DecisionEntry, DeadEndEntry,
  JournalEntry, DecisionsData, DeadEndsData, JournalData,
} from "../types.js";

export function addLink(link: Omit<KnowledgeLink, "created_at">): KnowledgeLink {
  const data = readJson<LinksData>(PATHS.links, { links: [] });

  const exists = data.links.some(
    l => l.from_timestamp === link.from_timestamp &&
         l.to_timestamp === link.to_timestamp
  );
  if (exists) {
    return data.links.find(
      l => l.from_timestamp === link.from_timestamp &&
           l.to_timestamp === link.to_timestamp
    )!;
  }

  const full: KnowledgeLink = {
    ...link,
    created_at: new Date().toISOString(),
  };

  data.links.push(full);
  if (data.links.length > 500) {
    data.links = data.links.slice(-500);
  }
  data.schema_version = SCHEMA_VERSION;
  writeJson(PATHS.links, data);

  updateCrossReferences(full);
  return full;
}

function updateCrossReferences(link: KnowledgeLink): void {
  if (link.from_type === "dead_end" && link.to_type === "decision") {
    const deData = readJson<DeadEndsData>(PATHS.deadEnds, { dead_ends: [] });
    const de = deData.dead_ends.find(d => d.timestamp === link.from_timestamp);
    if (de) {
      de.led_to_decision = link.to_timestamp;
      writeJson(PATHS.deadEnds, deData);
    }

    const decData = readJson<DecisionsData>(PATHS.decisions, { decisions: [] });
    const dec = decData.decisions.find(d => d.timestamp === link.to_timestamp);
    if (dec) {
      if (!dec.related_dead_ends) dec.related_dead_ends = [];
      if (!dec.related_dead_ends.includes(link.from_timestamp)) {
        dec.related_dead_ends.push(link.from_timestamp);
        writeJson(PATHS.decisions, decData);
      }
    }
  }

  if (link.from_type === "decision" && link.to_type === "dead_end") {
    const decData = readJson<DecisionsData>(PATHS.decisions, { decisions: [] });
    const dec = decData.decisions.find(d => d.timestamp === link.from_timestamp);
    if (dec) {
      if (!dec.related_dead_ends) dec.related_dead_ends = [];
      if (!dec.related_dead_ends.includes(link.to_timestamp)) {
        dec.related_dead_ends.push(link.to_timestamp);
        writeJson(PATHS.decisions, decData);
      }
    }

    const deData = readJson<DeadEndsData>(PATHS.deadEnds, { dead_ends: [] });
    const de = deData.dead_ends.find(d => d.timestamp === link.to_timestamp);
    if (de) {
      de.led_to_decision = link.from_timestamp;
      writeJson(PATHS.deadEnds, deData);
    }
  }
}

export function getLinksFor(
  type: "decision" | "dead_end" | "journal",
  timestamp: string
): KnowledgeLink[] {
  const data = readJson<LinksData>(PATHS.links, { links: [] });
  return data.links.filter(
    l => (l.from_type === type && l.from_timestamp === timestamp) ||
         (l.to_type === type && l.to_timestamp === timestamp)
  );
}

export function getConnectedSubgraph(
  type: "decision" | "dead_end" | "journal",
  timestamp: string,
  depth: number = 2
): {
  links: KnowledgeLink[];
  decisions: DecisionEntry[];
  dead_ends: DeadEndEntry[];
  journals: JournalEntry[];
} {
  const allLinks = readJson<LinksData>(PATHS.links, { links: [] }).links;
  const visited = new Set<string>();
  const resultLinks: KnowledgeLink[] = [];
  const queue: Array<{ type: string; ts: string; d: number }> = [
    { type, ts: timestamp, d: 0 }
  ];

  while (queue.length > 0) {
    const item = queue.shift()!;
    const key = `${item.type}:${item.ts}`;
    if (visited.has(key) || item.d > depth) continue;
    visited.add(key);

    const related = allLinks.filter(
      l => (l.from_type === item.type && l.from_timestamp === item.ts) ||
           (l.to_type === item.type && l.to_timestamp === item.ts)
    );

    for (const link of related) {
      if (!resultLinks.some(r => r.from_timestamp === link.from_timestamp && r.to_timestamp === link.to_timestamp)) {
        resultLinks.push(link);
      }
      if (link.from_type === item.type && link.from_timestamp === item.ts) {
        queue.push({ type: link.to_type, ts: link.to_timestamp, d: item.d + 1 });
      } else {
        queue.push({ type: link.from_type, ts: link.from_timestamp, d: item.d + 1 });
      }
    }
  }

  const decData = readJson<DecisionsData>(PATHS.decisions, { decisions: [] });
  const deData = readJson<DeadEndsData>(PATHS.deadEnds, { dead_ends: [] });
  const jData = readJson<JournalData>(PATHS.journal, { sessions: [] });

  const decTimestamps = new Set(
    [...visited].filter(v => v.startsWith("decision:")).map(v => v.slice(9))
  );
  const deTimestamps = new Set(
    [...visited].filter(v => v.startsWith("dead_end:")).map(v => v.slice(9))
  );
  const jTimestamps = new Set(
    [...visited].filter(v => v.startsWith("journal:")).map(v => v.slice(8))
  );

  return {
    links: resultLinks,
    decisions: decData.decisions.filter(d => decTimestamps.has(d.timestamp)),
    dead_ends: deData.dead_ends.filter(d => deTimestamps.has(d.timestamp)),
    journals: jData.sessions.filter(j => jTimestamps.has(j.timestamp)),
  };
}

export function getAllLinks(): KnowledgeLink[] {
  return readJson<LinksData>(PATHS.links, { links: [] }).links;
}
