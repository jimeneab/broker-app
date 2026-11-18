import { z } from "zod";
import { fetchJson } from "./http.js";
import type { CompanyMetrics, MarketDataProvider, NewsItem } from "./types.js";

const BASE_URL = "https://finnhub.io/api/v1";

const searchSchema = z.object({
  result: z.array(z.object({ symbol: z.string(), description: z.string(), type: z.string() })),
});
const quoteSchema = z.object({
  c: z.number(),
  d: z.number().nullable(),
  dp: z.number().nullable(),
  h: z.number(),
  l: z.number(),
  o: z.number(),
  pc: z.number(),
  t: z.number(),
});
const profileSchema = z
  .object({
    ticker: z.string(),
    name: z.string(),
    logo: z.string(),
    finnhubIndustry: z.string(),
    country: z.string(),
    weburl: z.string(),
    exchange: z.string(),
    currency: z.string(),
    marketCapitalization: z.number(),
  })
  .partial(); // {} = not found
const n = z.number().nullish(); // Finnhub omits or sends null depending on the symbol
const metricSchema = z.object({
  metric: z.object({
    peTTM: n,
    peBasicExclExtraTTM: n,
    beta: n,
    "52WeekHigh": n,
    "52WeekLow": n,
    dividendYieldIndicatedAnnual: n,
    marketCapitalization: n,
  }),
});
const newsSchema = z.array(
  z.object({
    id: z.number(),
    headline: z.string(),
    source: z.string(),
    summary: z.string(),
    url: z.string(),
    image: z.string(),
    datetime: z.number(),
    related: z.string(),
  }),
);

const orNull = (value: string | undefined) => (value ? value : null);

function toNews(items: z.infer<typeof newsSchema>): NewsItem[] {
  return items.map((item) => ({
    id: item.id,
    headline: item.headline,
    source: item.source,
    summary: item.summary,
    url: item.url,
    imageUrl: orNull(item.image),
    publishedAt: new Date(item.datetime * 1000).toISOString(),
    related: orNull(item.related),
  }));
}

export function createFinnhubProvider(apiKey: string): Omit<MarketDataProvider, "history"> {
  const get = <S extends z.ZodType>(path: string, params: Record<string, string>, schema: S) =>
    fetchJson("finnhub", `${BASE_URL}${path}?${new URLSearchParams(params)}`, { "X-Finnhub-Token": apiKey }, schema);

  return {
    async search(query) {
      const body = await get("/search", { q: query }, searchSchema);
      return body.result.map((r) => ({ symbol: r.symbol, name: r.description, type: r.type }));
    },

    async quote(symbol) {
      const upper = symbol.toUpperCase();
      const q = await get("/quote", { symbol: upper }, quoteSchema);
      // Finnhub answers all zeros for unknown symbols.
      if (q.t === 0) return null;
      return {
        symbol: upper,
        price: q.c,
        change: q.d,
        changePercent: q.dp,
        high: q.h,
        low: q.l,
        open: q.o,
        previousClose: q.pc,
        timestamp: q.t,
      };
    },

    async profile(symbol) {
      const p = await get("/stock/profile2", { symbol: symbol.toUpperCase() }, profileSchema);
      if (!p.ticker) return null;
      return {
        symbol: p.ticker,
        name: p.name || p.ticker,
        logoUrl: orNull(p.logo),
        industry: orNull(p.finnhubIndustry),
        country: orNull(p.country),
        website: orNull(p.weburl),
        exchange: orNull(p.exchange),
        currency: orNull(p.currency),
        marketCapMillions: p.marketCapitalization ?? null,
      };
    },

    async metrics(symbol) {
      const { metric: m } = await get("/stock/metric", { symbol: symbol.toUpperCase(), metric: "all" }, metricSchema);
      const metrics: CompanyMetrics = {
        peRatio: m.peTTM ?? m.peBasicExclExtraTTM ?? null,
        beta: m.beta ?? null,
        week52High: m["52WeekHigh"] ?? null,
        week52Low: m["52WeekLow"] ?? null,
        dividendYieldPercent: m.dividendYieldIndicatedAnnual ?? null,
        marketCapMillions: m.marketCapitalization ?? null,
      };
      return Object.values(metrics).every((v) => v === null) ? null : metrics;
    },

    async companyNews(symbol, from, to) {
      return toNews(await get("/company-news", { symbol: symbol.toUpperCase(), from, to }, newsSchema));
    },

    async marketNews(category) {
      return toNews(await get("/news", { category }, newsSchema));
    },
  };
}
