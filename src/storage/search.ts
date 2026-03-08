import type { SearchOptions, ScoredResult, TextFields } from "../types.js";

function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
      );
    }
  }
  return dp[m][n];
}

interface ParsedQuery {
  requiredWords: string[];
  optionalWords: string[];
  tagFilters: string[];
  projectFilter: string | null;
}

function parseQuery(query: string, options?: SearchOptions): ParsedQuery {
  const tokens = query.toLowerCase().split(/\s+/).filter(w => w.length > 1);
  const parsed: ParsedQuery = {
    requiredWords: [],
    optionalWords: [],
    tagFilters: options?.tags ? [...options.tags] : [],
    projectFilter: options?.project ?? null,
  };

  for (const token of tokens) {
    if (token.startsWith("tag:")) {
      parsed.tagFilters.push(token.slice(4));
    } else if (token.startsWith("project:")) {
      parsed.projectFilter = token.slice(8);
    } else if (token.startsWith("+")) {
      const word = token.slice(1);
      if (word.length > 0) parsed.requiredWords.push(word);
    } else {
      if (options?.mode === "and") {
        parsed.requiredWords.push(token);
      } else {
        parsed.optionalWords.push(token);
      }
    }
  }

  return parsed;
}

export function scoredSearch<T>(
  entries: T[],
  query: string,
  fieldExtractor: (entry: T) => TextFields,
  options?: SearchOptions
): ScoredResult<T>[] {
  const limit = options?.limit ?? 20;
  const parsed = parseQuery(query, options);
  const useFuzzy = options?.fuzzy !== false;
  const now = Date.now();

  if (
    parsed.requiredWords.length === 0 &&
    parsed.optionalWords.length === 0 &&
    parsed.tagFilters.length === 0 &&
    !parsed.projectFilter
  ) {
    return entries.slice(-limit).map(entry => ({
      entry,
      score: 1,
      match_reasons: ["recent"],
    }));
  }

  const scored: ScoredResult<T>[] = [];

  for (const entry of entries) {
    const fields = fieldExtractor(entry);
    const text = fields.text.toLowerCase();
    const entryTags = (fields.tags ?? []).map(t => t.toLowerCase());
    const entryProject = (fields.project ?? "").toLowerCase();
    let score = 0;
    const reasons: string[] = [];

    let allRequired = true;
    for (const word of parsed.requiredWords) {
      if (text.includes(word)) {
        score += 3;
        reasons.push(`required:"${word}"`);
      } else if (useFuzzy && word.length <= 12) {
        const textWords = text.split(/\s+/);
        const fuzzyMatch = textWords.some(tw => {
          if (Math.abs(tw.length - word.length) > 2) return false;
          return levenshtein(tw, word) <= 2;
        });
        if (fuzzyMatch) {
          score += 1;
          reasons.push(`fuzzy:"${word}"`);
        } else {
          allRequired = false;
        }
      } else {
        allRequired = false;
      }
    }
    if (!allRequired && parsed.requiredWords.length > 0) continue;

    for (const word of parsed.optionalWords) {
      const exactCount = text.split(word).length - 1;
      if (exactCount > 0) {
        score += 2 * Math.min(exactCount, 3);
        reasons.push(`match:"${word}"x${exactCount}`);
      } else if (useFuzzy && word.length <= 12) {
        const textWords = text.split(/\s+/);
        const fuzzyMatch = textWords.some(tw => {
          if (Math.abs(tw.length - word.length) > 2) return false;
          return levenshtein(tw, word) <= 2;
        });
        if (fuzzyMatch) {
          score += 0.5;
          reasons.push(`fuzzy:"${word}"`);
        }
      }
    }

    for (const tagFilter of parsed.tagFilters) {
      if (entryTags.some(t => t.includes(tagFilter))) {
        score += 4;
        reasons.push(`tag:"${tagFilter}"`);
      }
    }

    if (parsed.projectFilter) {
      if (entryProject.includes(parsed.projectFilter)) {
        score += 3;
        reasons.push(`project:"${parsed.projectFilter}"`);
      } else {
        continue;
      }
    }

    if (fields.timestamp) {
      const ageMs = now - new Date(fields.timestamp).getTime();
      const ageDays = ageMs / (1000 * 60 * 60 * 24);
      const recencyBonus = Math.max(0, 1 - ageDays / 30);
      score += recencyBonus;
      if (recencyBonus > 0.5) reasons.push("recent");
    }

    if (score > 0) {
      scored.push({ entry, score, match_reasons: reasons });
    }
  }

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit);
}

export function searchEntries<T>(
  entries: T[],
  query: string,
  textExtractor: (entry: T) => string,
  limit: number = 20
): T[] {
  const results = scoredSearch(
    entries,
    query,
    (entry) => ({ text: textExtractor(entry) }),
    { limit }
  );
  return results.map(r => r.entry);
}
