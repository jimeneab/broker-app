import { z } from "zod";
import { AppError } from "../middlewares/errorHandler.js";
import {
  marketData,
  type Candle,
  type CompanyMetrics,
  type CompanyProfile,
  type HistoryInterval,
  type Quote,
  type SymbolSearchResult,
} from "../providers/index.js";
import { CACHE_TTL, getOrSet } from "./cache.js";

export type StockRange = "1M" | "6M" | "1Y" | "5Y";

const SYMBOL_PATTERN = /^[A-Z]{1,5}(\.[A-Z])?$/;
export const symbolSchema = z.string().trim().toUpperCase().regex(SYMBOL_PATTERN);
export const rangeSchema = z.enum(["1M", "6M", "1Y", "5Y"]);
export const searchQuerySchema = z.string().trim().toLowerCase().min(1).max(50);

export interface StockSearchResult {
  symbol: string;
  name: string;
  type: "stock" | "etf";
}
export interface StockDetail {
  symbol: string;
  quote: Quote;
  profile: CompanyProfile | null;
  metrics: CompanyMetrics | null;
}
export interface StockHistory {
  symbol: string;
  range: StockRange;
  interval: HistoryInterval;
  candles: Candle[];
}

const SEARCH_TYPES: Record<string, StockSearchResult["type"]> = {
  "Common Stock": "stock",
  ADR: "stock",
  ETP: "etf",
};
const MAX_SEARCH_RESULTS = 10;

// One daily series serves 1M/6M/1Y so a symbol costs at most 2 Twelve Data credits per TTL.
const HISTORY_SERIES: Record<StockRange, { interval: HistoryInterval; outputSize: number; months: number }> = {
  "1M": { interval: "1day", outputSize: 260, months: 1 },
  "6M": { interval: "1day", outputSize: 260, months: 6 },
  "1Y": { interval: "1day", outputSize: 260, months: 12 },
  "5Y": { interval: "1week", outputSize: 270, months: 60 },
};

const symbolNotFound = () => new AppError(404, "SYMBOL_NOT_FOUND", "Symbol not found");

function parseSymbol(input: unknown): string {
  const parsed = symbolSchema.safeParse(input);
  if (!parsed.success) throw new AppError(400, "VALIDATION_ERROR", "Invalid symbol");
  return parsed.data;
}

export function filterSearchResults(results: SymbolSearchResult[]): StockSearchResult[] {
  const seen = new Set<string>();
  const filtered: StockSearchResult[] = [];
  for (const r of results) {
    const type = SEARCH_TYPES[r.type];
    if (!type || !SYMBOL_PATTERN.test(r.symbol) || seen.has(r.symbol)) continue;
    seen.add(r.symbol);
    filtered.push({ symbol: r.symbol, name: r.name, type });
    if (filtered.length === MAX_SEARCH_RESULTS) break;
  }
  return filtered;
}

/** Keeps the candles inside `range`, anchored on the last candle (not "today"), so weekends and cache age do not matter. */
export function sliceRange(candles: Candle[], range: StockRange): Candle[] {
  const last = candles.at(-1);
  if (!last) return [];
  const cut = new Date(`${last.date}T00:00:00Z`);
  cut.setUTCMonth(cut.getUTCMonth() - HISTORY_SERIES[range].months);
  const cutDate = cut.toISOString().slice(0, 10);
  return candles.filter((c) => c.date > cutDate);
}

/** lightweight-charts throws on unordered or duplicated times; keeps the first candle of each date. */
function ascendingUnique(candles: Candle[]): Candle[] {
  const seen = new Set<string>();
  return candles
    .filter((c) => !seen.has(c.date) && seen.add(c.date))
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
}

export async function searchStocks(q: unknown): Promise<{ query: string; results: StockSearchResult[] }> {
  const parsed = searchQuerySchema.safeParse(q);
  if (!parsed.success) throw new AppError(400, "VALIDATION_ERROR", "q must be 1 to 50 characters");
  const query = parsed.data;
  // The raw provider answer is cached, so changing the filter never requires flushing the cache.
  const raw = await getOrSet(`finnhub:search:${query}`, CACHE_TTL.search, () => marketData.search(query));
  return { query, results: filterSearchResults(raw) };
}

export async function getStock(symbolInput: unknown): Promise<StockDetail> {
  const S = parseSymbol(symbolInput);
  const [quote, profile, metrics] = await Promise.allSettled([
    getOrSet(`finnhub:quote:${S}`, CACHE_TTL.quote, () => marketData.quote(S)),
    getOrSet(`finnhub:profile:${S}`, CACHE_TTL.profile, () => marketData.profile(S)),
    getOrSet(`finnhub:metrics:${S}`, CACHE_TTL.metrics, () => marketData.metrics(S)),
  ]);
  if (quote.status === "rejected") throw quote.reason;
  // Only the quote exists for every US stock and ETF, so it alone decides the 404.
  if (quote.value === null) throw symbolNotFound();

  const partial = <T>(name: string, result: PromiseSettledResult<T | null>): T | null => {
    if (result.status === "fulfilled") return result.value;
    console.error(`[stocks] ${name} ${S} failed:`, result.reason);
    return null;
  };
  return { symbol: S, quote: quote.value, profile: partial("profile", profile), metrics: partial("metrics", metrics) };
}

export async function getStockHistory(symbolInput: unknown, rangeInput: unknown): Promise<StockHistory> {
  const S = parseSymbol(symbolInput);
  const parsedRange = rangeSchema.safeParse(rangeInput);
  if (!parsedRange.success) throw new AppError(400, "VALIDATION_ERROR", "range must be one of 1M, 6M, 1Y, 5Y");
  const range = parsedRange.data;
  const { interval, outputSize } = HISTORY_SERIES[range];

  const candles = await getOrSet(`twelvedata:history:${S}:${interval}:${outputSize}`, CACHE_TTL.history, () =>
    marketData.history(S, interval, outputSize),
  );
  if (candles === null) throw symbolNotFound();
  return { symbol: S, range, interval, candles: sliceRange(ascendingUnique(candles), range) };
}
