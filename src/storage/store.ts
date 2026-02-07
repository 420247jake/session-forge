import { readFileSync, writeFileSync, mkdirSync, existsSync, unlinkSync } from "node:fs";
import { dirname } from "node:path";

export function readJson<T>(filePath: string, fallback: T): T {
  try {
    if (!existsSync(filePath)) return fallback;
    return JSON.parse(readFileSync(filePath, "utf-8")) as T;
  } catch {
    return fallback;
  }
}

export function writeJson<T>(filePath: string, data: T): void {
  const dir = dirname(filePath);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
}

export function deleteJson(filePath: string): boolean {
  try {
    if (existsSync(filePath)) {
      unlinkSync(filePath);
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

export function searchEntries<T>(
  entries: T[],
  query: string,
  textExtractor: (entry: T) => string
): T[] {
  const words = query
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w.length > 1);

  if (words.length === 0) return entries.slice(-20);

  const filtered = entries.filter((entry) => {
    const text = textExtractor(entry).toLowerCase();
    return words.some((word) => text.includes(word));
  });

  return filtered.slice(-20);
}
