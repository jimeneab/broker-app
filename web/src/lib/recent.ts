import { normalizeSymbol } from "./stocks";

export const RECENT_KEY = "si:recent-symbols";
export const RECENT_MAX = 8;

/** Puts `symbol` first, without duplicates, capped at `max`. An invalid symbol returns a copy of the list. */
export function addRecent(list: readonly string[], symbol: string, max = RECENT_MAX): string[] {
  const s = normalizeSymbol(symbol);
  if (!s) return [...list];
  return [s, ...list.filter((x) => x !== s)].slice(0, max);
}

/** localStorage JSON → valid symbols. Never throws: corrupted data just means no recents. */
export function parseRecent(raw: string | null): string[] {
  if (raw === null) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];
  const symbols: string[] = [];
  for (const item of parsed) {
    const s = typeof item === "string" ? normalizeSymbol(item) : null;
    if (s && !symbols.includes(s)) symbols.push(s);
  }
  return symbols.slice(0, RECENT_MAX);
}
