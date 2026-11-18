import { z } from "zod";
import { fetchJson, providerError, rateLimited } from "./http.js";
import type { MarketDataProvider } from "./types.js";

const BASE_URL = "https://api.twelvedata.com";

// Twelve Data sends numbers as strings and errors as HTTP 200 with status "error".
const timeSeriesSchema = z.discriminatedUnion("status", [
  z.object({
    status: z.literal("ok"),
    values: z.array(
      z.object({
        datetime: z.string(),
        open: z.coerce.number(),
        high: z.coerce.number(),
        low: z.coerce.number(),
        close: z.coerce.number(),
        volume: z.coerce.number().optional(),
      }),
    ),
  }),
  z.object({ status: z.literal("error"), code: z.number(), message: z.string() }),
]);

export function createTwelveDataProvider(apiKey: string): Pick<MarketDataProvider, "history"> {
  return {
    async history(symbol, interval, outputSize) {
      const params = new URLSearchParams({
        symbol: symbol.toUpperCase(),
        interval,
        outputsize: String(outputSize),
        order: "asc",
      });
      const url = `${BASE_URL}/time_series?${params}`;
      const body = await fetchJson("twelvedata", url, { Authorization: `apikey ${apiKey}` }, timeSeriesSchema);

      if (body.status === "error") {
        if (body.code === 429) throw rateLimited();
        if (body.code === 400 || body.code === 404) return null;
        throw providerError("twelvedata", url, `code ${body.code}: ${body.message}`);
      }
      return body.values.map((v) => ({
        date: v.datetime.slice(0, 10),
        open: v.open,
        high: v.high,
        low: v.low,
        close: v.close,
        volume: v.volume ?? null,
      }));
    },
  };
}
