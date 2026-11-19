import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AppError } from "../middlewares/errorHandler.js";
import type { Candle, CompanyMetrics, CompanyProfile, Quote, SymbolSearchResult } from "../providers/types.js";

type Row = { payload: unknown; expires_at: string };

// Same fake query builder as cache.test.ts, so the real getOrSet runs and provider calls can be counted.
const store = new Map<string, Row>();
const fakeClient = {
  from: () => ({
    select: () => ({
      eq: (_column: string, key: string) => ({ maybeSingle: async () => ({ data: store.get(key) ?? null, error: null }) }),
    }),
    upsert: async (row: Row & { key: string }) => {
      store.set(row.key, { payload: row.payload, expires_at: row.expires_at });
      return { error: null };
    },
  }),
};
vi.mock("../lib/supabase.js", () => ({ adminClient: () => fakeClient }));

const marketData = {
  search: vi.fn(),
  quote: vi.fn(),
  profile: vi.fn(),
  metrics: vi.fn(),
  history: vi.fn(),
};
vi.mock("../providers/index.js", () => ({ marketData }));

const { filterSearchResults, getStock, getStockHistory, searchStocks, sliceRange } = await import("./stockService.js");

const quote: Quote = {
  symbol: "AAPL",
  price: 189.84,
  change: 2.31,
  changePercent: 1.23,
  high: 190.1,
  low: 186.9,
  open: 187.2,
  previousClose: 187.53,
  timestamp: 1795545600,
};
const profile: CompanyProfile = {
  symbol: "AAPL",
  name: "Apple Inc",
  logoUrl: null,
  industry: "Technology",
  country: "US",
  website: "https://www.apple.com/",
  exchange: "NASDAQ",
  currency: "USD",
  marketCapMillions: 2_950_000,
};
const metrics: CompanyMetrics = {
  peRatio: 29.4,
  beta: 1.24,
  week52High: 199.62,
  week52Low: 164.08,
  dividendYieldPercent: 0.51,
  marketCapMillions: 2_950_000,
};

const r = (symbol: string, type = "Common Stock"): SymbolSearchResult => ({ symbol, name: `${symbol} INC`, type });
const candle = (date: string): Candle => ({ date, open: 1, high: 2, low: 0.5, close: 1.5, volume: 100 });

/** Daily candles (every calendar day) between two dates, inclusive. */
function dailyCandles(from: string, to: string): Candle[] {
  const out: Candle[] = [];
  for (let d = new Date(`${from}T00:00:00Z`); d <= new Date(`${to}T00:00:00Z`); d.setUTCDate(d.getUTCDate() + 1)) {
    out.push(candle(d.toISOString().slice(0, 10)));
  }
  return out;
}

async function expectAppError(promise: Promise<unknown>, status: number, code: string) {
  const err = await promise.catch((e: unknown) => e);
  expect(err).toBeInstanceOf(AppError);
  expect(err).toMatchObject({ status, code });
}

beforeEach(() => {
  store.clear();
  Object.values(marketData).forEach((fn) => fn.mockReset());
  vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => vi.restoreAllMocks());

describe("searchStocks", () => {
  it("normalizes q and uses it as provider argument and cache key", async () => {
    marketData.search.mockResolvedValue([r("AAPL")]);
    await expect(searchStocks("  Apple ")).resolves.toEqual({
      query: "apple",
      results: [{ symbol: "AAPL", name: "AAPL INC", type: "stock" }],
    });
    expect(marketData.search).toHaveBeenCalledWith("apple");
    expect(store.has("finnhub:search:apple")).toBe(true);
  });

  it.each([[""], ["   "], ["x".repeat(51)], [["a", "b"]], [undefined]])("rejects q=%j with 400 and no provider call", async (q) => {
    await expectAppError(searchStocks(q), 400, "VALIDATION_ERROR");
    expect(marketData.search).not.toHaveBeenCalled();
  });

  it("uses the cache for the same query", async () => {
    marketData.search.mockResolvedValue([r("AAPL")]);
    await searchStocks("apple");
    await searchStocks("APPLE");
    expect(marketData.search).toHaveBeenCalledOnce();
  });

  it("returns an empty list when nothing valid matches", async () => {
    marketData.search.mockResolvedValue([r("AAPL.MX")]);
    await expect(searchStocks("x")).resolves.toEqual({ query: "x", results: [] });
  });
});

describe("filterSearchResults", () => {
  it("maps Common Stock and ADR to stock, ETP to etf, and drops other types", () => {
    const out = filterSearchResults([
      r("AAPL"),
      r("TSM", "ADR"),
      r("SPY", "ETP"),
      r("PFDX", "PFD"),
      r("REIT", "REIT"),
      r("WARR", "Warrant"),
    ]);
    expect(out.map((x) => [x.symbol, x.type])).toEqual([
      ["AAPL", "stock"],
      ["TSM", "stock"],
      ["SPY", "etf"],
    ]);
  });

  it("accepts US share classes and drops foreign or malformed symbols", () => {
    const out = filterSearchResults([r("BRK.A"), r("BRK.B"), r("AAPL.MX"), r("0R2V.L"), r("BRK-B")]);
    expect(out.map((x) => x.symbol)).toEqual(["BRK.A", "BRK.B"]);
  });

  it("keeps the first of duplicated symbols", () => {
    const out = filterSearchResults([r("BABA", "ADR"), r("BABA", "Common Stock")]);
    expect(out).toHaveLength(1);
  });

  it("keeps provider order and caps at 10", () => {
    const symbols = "ABCDEFGHIJKLMNO".split("");
    expect(filterSearchResults(symbols.map((s) => r(s))).map((x) => x.symbol)).toEqual(symbols.slice(0, 10));
  });
});

describe("getStock", () => {
  beforeEach(() => {
    marketData.quote.mockResolvedValue(quote);
    marketData.profile.mockResolvedValue(profile);
    marketData.metrics.mockResolvedValue(metrics);
  });

  it("normalizes the symbol and composes quote, profile and metrics", async () => {
    await expect(getStock("aapl")).resolves.toEqual({ symbol: "AAPL", quote, profile, metrics });
    expect(marketData.quote).toHaveBeenCalledWith("AAPL");
    expect(marketData.profile).toHaveBeenCalledWith("AAPL");
    expect(marketData.metrics).toHaveBeenCalledWith("AAPL");
  });

  it("starts the three calls in parallel", async () => {
    const pending: Array<() => void> = [];
    const deferred = <T>(value: T) => () => new Promise<T>((resolve) => pending.push(() => resolve(value)));
    marketData.quote.mockImplementation(deferred(quote));
    marketData.profile.mockImplementation(deferred(profile));
    marketData.metrics.mockImplementation(deferred(metrics));
    const result = getStock("AAPL");
    await vi.waitFor(() => expect(pending).toHaveLength(3));
    pending.forEach((resolve) => resolve());
    await expect(result).resolves.toMatchObject({ symbol: "AAPL" });
  });

  it("returns 404 SYMBOL_NOT_FOUND when the quote is null, even with a profile", async () => {
    marketData.quote.mockResolvedValue(null);
    await expectAppError(getStock("ZZZZZ"), 404, "SYMBOL_NOT_FOUND");
  });

  it("rethrows a failed quote", async () => {
    marketData.quote.mockRejectedValue(new AppError(503, "PROVIDER_RATE_LIMITED", "limited"));
    await expectAppError(getStock("AAPL"), 503, "PROVIDER_RATE_LIMITED");
  });

  it("returns profile null and logs when only the profile fails", async () => {
    marketData.profile.mockRejectedValue(new AppError(502, "PROVIDER_ERROR", "bad"));
    await expect(getStock("AAPL")).resolves.toEqual({ symbol: "AAPL", quote, profile: null, metrics });
    expect(console.error).toHaveBeenCalledWith("[stocks] profile AAPL failed:", expect.any(AppError));
  });

  it("returns metrics null when the provider has none", async () => {
    marketData.metrics.mockResolvedValue(null);
    await expect(getStock("AAPL")).resolves.toMatchObject({ metrics: null });
  });

  it.each([[""], ["AAPL1"], ["TOOLONG"], ["AAPL.MX"], ["BRK-B"]])("rejects symbol %j with 400 and no calls", async (s) => {
    await expectAppError(getStock(s), 400, "VALIDATION_ERROR");
    expect(marketData.quote).not.toHaveBeenCalled();
  });

  it("accepts share classes in lowercase", async () => {
    await expect(getStock("brk.b")).resolves.toMatchObject({ symbol: "BRK.B" });
  });

  it("uses the cache: two details call each provider once", async () => {
    await getStock("AAPL");
    await getStock("AAPL");
    expect(marketData.quote).toHaveBeenCalledOnce();
    expect(marketData.profile).toHaveBeenCalledOnce();
    expect(marketData.metrics).toHaveBeenCalledOnce();
  });
});

describe("getStockHistory", () => {
  it("serves 1M, 6M and 1Y from one daily series and a single provider call", async () => {
    marketData.history.mockResolvedValue(dailyCandles("2025-11-14", "2026-11-13"));
    const m1 = await getStockHistory("AAPL", "1M");
    const m6 = await getStockHistory("aapl", "6M");
    const y1 = await getStockHistory("AAPL", "1Y");
    expect(marketData.history).toHaveBeenCalledOnce();
    expect(marketData.history).toHaveBeenCalledWith("AAPL", "1day", 260);
    expect(m1).toMatchObject({ symbol: "AAPL", range: "1M", interval: "1day" });
    expect(m1.candles.length).toBeLessThan(m6.candles.length);
    expect(m6.candles.length).toBeLessThan(y1.candles.length);
  });

  it("uses a weekly series for 5Y", async () => {
    marketData.history.mockResolvedValue([candle("2026-11-09")]);
    await expect(getStockHistory("AAPL", "5Y")).resolves.toMatchObject({ interval: "1week" });
    expect(marketData.history).toHaveBeenCalledWith("AAPL", "1week", 270);
  });

  it.each([["2Y"], [undefined]])("rejects range %j with 400", async (range) => {
    await expectAppError(getStockHistory("AAPL", range), 400, "VALIDATION_ERROR");
    expect(marketData.history).not.toHaveBeenCalled();
  });

  it("returns 404 when the provider has no series", async () => {
    marketData.history.mockResolvedValue(null);
    await expectAppError(getStockHistory("ZZZZZ", "6M"), 404, "SYMBOL_NOT_FOUND");
  });

  it("returns an empty list as is", async () => {
    marketData.history.mockResolvedValue([]);
    await expect(getStockHistory("AAPL", "6M")).resolves.toMatchObject({ candles: [] });
  });

  it("sorts ascending and drops repeated dates", async () => {
    const first = { ...candle("2026-11-12"), close: 1 };
    marketData.history.mockResolvedValue([candle("2026-11-13"), first, { ...candle("2026-11-12"), close: 9 }, candle("2026-11-11")]);
    const { candles } = await getStockHistory("AAPL", "1M");
    expect(candles.map((c) => c.date)).toEqual(["2026-11-11", "2026-11-12", "2026-11-13"]);
    expect(candles[1]).toEqual(first);
  });
});

describe("sliceRange", () => {
  const year = dailyCandles("2025-11-14", "2026-11-13");

  it("anchors on the last candle", () => {
    expect(sliceRange(year, "1M")[0]?.date).toBe("2026-10-14");
    expect(sliceRange(year, "1Y")[0]?.date).toBe("2025-11-14");
    expect(sliceRange(year, "1Y")).toHaveLength(year.length);
  });

  it("follows setUTCMonth at month end (Mar 31 − 1 month = Mar 3 in 2026)", () => {
    expect(sliceRange(dailyCandles("2026-02-01", "2026-03-31"), "1M")[0]?.date).toBe("2026-03-04");
  });

  it("returns an empty list for an empty input", () => {
    expect(sliceRange([], "6M")).toEqual([]);
  });
});
