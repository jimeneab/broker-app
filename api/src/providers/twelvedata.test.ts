import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createTwelveDataProvider } from "./twelvedata.js";

const fetchMock = vi.fn();
const twelvedata = createTwelveDataProvider("td-key");

describe("twelvedata provider", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
    vi.spyOn(console, "error").mockImplementation(() => {});
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    fetchMock.mockReset();
  });

  it("requests the time series and converts strings to numbers", async () => {
    fetchMock.mockResolvedValue(
      Response.json({
        meta: { symbol: "AAPL" },
        status: "ok",
        values: [
          { datetime: "2026-11-17", open: "189.0", high: "191.0", low: "188.0", close: "190.5", volume: "50000000" },
          { datetime: "2026-11-18", open: "190.5", high: "192.0", low: "190.0", close: "191.2", volume: "42000000" },
        ],
      }),
    );
    const candles = await twelvedata.history("aapl", "1day", 2);
    expect(candles).toEqual([
      { date: "2026-11-17", open: 189, high: 191, low: 188, close: 190.5, volume: 50000000 },
      { date: "2026-11-18", open: 190.5, high: 192, low: 190, close: 191.2, volume: 42000000 },
    ]);

    const [rawUrl, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const url = new URL(rawUrl);
    expect(url.origin + url.pathname).toBe("https://api.twelvedata.com/time_series");
    expect(Object.fromEntries(url.searchParams)).toEqual({
      symbol: "AAPL",
      interval: "1day",
      outputsize: "2",
      order: "asc",
    });
    expect((init.headers as Record<string, string>).Authorization).toBe("apikey td-key");
  });

  it("maps a missing volume to null", async () => {
    fetchMock.mockResolvedValue(
      Response.json({ status: "ok", values: [{ datetime: "2026-11-18", open: "1", high: "1", low: "1", close: "1" }] }),
    );
    const candles = await twelvedata.history("SPX", "1week", 1);
    expect(candles?.[0]?.volume).toBeNull();
  });

  it("maps body code 429 to 503", async () => {
    fetchMock.mockResolvedValue(Response.json({ status: "error", code: 429, message: "limit" }));
    await expect(twelvedata.history("AAPL", "1day", 1)).rejects.toMatchObject({ status: 503, code: "PROVIDER_RATE_LIMITED" });
  });

  it.each([400, 404])("returns null for body code %i (unknown symbol)", async (code) => {
    fetchMock.mockResolvedValue(Response.json({ status: "error", code, message: "not found" }));
    await expect(twelvedata.history("ZZZZ", "1day", 1)).resolves.toBeNull();
  });

  it("maps other body codes to 502", async () => {
    fetchMock.mockResolvedValue(Response.json({ status: "error", code: 500, message: "oops" }));
    await expect(twelvedata.history("AAPL", "1day", 1)).rejects.toMatchObject({ status: 502, code: "PROVIDER_ERROR" });
  });
});
