import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createFinnhubProvider } from "./finnhub.js";

const fetchMock = vi.fn();
const finnhub = createFinnhubProvider("fh-key");

function respond(body: unknown) {
  fetchMock.mockResolvedValue(Response.json(body));
}
function requested() {
  const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
  return { url: new URL(url), headers: init.headers as Record<string, string> };
}

const newsFixture = [
  {
    category: "company",
    datetime: 1763452800,
    headline: "Apple ships",
    id: 1,
    image: "",
    related: "AAPL",
    source: "Reuters",
    summary: "Summary",
    url: "https://news.example/1",
  },
];

describe("finnhub provider", () => {
  beforeEach(() => vi.stubGlobal("fetch", fetchMock));
  afterEach(() => {
    vi.unstubAllGlobals();
    fetchMock.mockReset();
  });

  it("search filters to US and authenticates by header", async () => {
    respond({ count: 1, result: [{ description: "APPLE INC", displaySymbol: "AAPL", symbol: "AAPL", type: "Common Stock" }] });
    await expect(finnhub.search("apple")).resolves.toEqual([{ symbol: "AAPL", name: "APPLE INC", type: "Common Stock" }]);
    const { url, headers } = requested();
    expect(url.origin + url.pathname).toBe("https://finnhub.io/api/v1/search");
    expect(url.searchParams.get("q")).toBe("apple");
    expect(url.searchParams.get("exchange")).toBe("US");
    expect(url.searchParams.has("token")).toBe(false);
    expect(headers["X-Finnhub-Token"]).toBe("fh-key");
  });

  it("quote uppercases the symbol and maps fields", async () => {
    respond({ c: 190.5, d: 1.5, dp: 0.79, h: 191, l: 188, o: 189, pc: 189, t: 1763452800 });
    await expect(finnhub.quote("aapl")).resolves.toEqual({
      symbol: "AAPL",
      price: 190.5,
      change: 1.5,
      changePercent: 0.79,
      high: 191,
      low: 188,
      open: 189,
      previousClose: 189,
      timestamp: 1763452800,
    });
    expect(requested().url.searchParams.get("symbol")).toBe("AAPL");
  });

  it("quote returns null for unknown symbols (t: 0)", async () => {
    respond({ c: 0, d: null, dp: null, h: 0, l: 0, o: 0, pc: 0, t: 0 });
    await expect(finnhub.quote("ZZZZ")).resolves.toBeNull();
  });

  it("profile maps fields and turns empty strings into null", async () => {
    respond({
      country: "US",
      currency: "USD",
      exchange: "NASDAQ NMS - GLOBAL MARKET",
      finnhubIndustry: "Technology",
      ipo: "1980-12-12",
      logo: "",
      marketCapitalization: 2900000,
      name: "Apple Inc",
      ticker: "AAPL",
      weburl: "https://www.apple.com/",
    });
    await expect(finnhub.profile("AAPL")).resolves.toEqual({
      symbol: "AAPL",
      name: "Apple Inc",
      logoUrl: null,
      industry: "Technology",
      country: "US",
      website: "https://www.apple.com/",
      exchange: "NASDAQ NMS - GLOBAL MARKET",
      currency: "USD",
      marketCapMillions: 2900000,
    });
    expect(requested().url.pathname).toBe("/api/v1/stock/profile2");
  });

  it("profile returns null for {}", async () => {
    respond({});
    await expect(finnhub.profile("ZZZZ")).resolves.toBeNull();
  });

  it("metrics maps fields, falling back to peBasicExclExtraTTM", async () => {
    respond({
      metric: {
        peBasicExclExtraTTM: 30.1,
        beta: 1.2,
        "52WeekHigh": 200,
        "52WeekLow": 150,
        dividendYieldIndicatedAnnual: null,
        marketCapitalization: 2900000,
        other: 1,
      },
      series: {},
    });
    await expect(finnhub.metrics("AAPL")).resolves.toEqual({
      peRatio: 30.1,
      beta: 1.2,
      week52High: 200,
      week52Low: 150,
      dividendYieldPercent: null,
      marketCapMillions: 2900000,
    });
    expect(requested().url.searchParams.get("metric")).toBe("all");
  });

  it("metrics returns null when metric is empty", async () => {
    respond({ metric: {}, series: {} });
    await expect(finnhub.metrics("ZZZZ")).resolves.toBeNull();
  });

  it("companyNews maps items (image '' -> null, datetime -> ISO)", async () => {
    respond(newsFixture);
    const [item] = await finnhub.companyNews("aapl", "2026-11-11", "2026-11-18");
    expect(item).toEqual({
      id: 1,
      headline: "Apple ships",
      source: "Reuters",
      summary: "Summary",
      url: "https://news.example/1",
      imageUrl: null,
      publishedAt: "2025-11-18T08:00:00.000Z",
      related: "AAPL",
    });
    const { url } = requested();
    expect(url.pathname).toBe("/api/v1/company-news");
    expect(Object.fromEntries(url.searchParams)).toEqual({ symbol: "AAPL", from: "2026-11-11", to: "2026-11-18" });
  });

  it("marketNews requests the category and maps related '' -> null", async () => {
    respond([{ ...newsFixture[0], related: "", image: "https://img.example/1.png" }]);
    const [item] = await finnhub.marketNews("general");
    expect(item?.related).toBeNull();
    expect(item?.imageUrl).toBe("https://img.example/1.png");
    expect(requested().url.searchParams.get("category")).toBe("general");
  });
});
