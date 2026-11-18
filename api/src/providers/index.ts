import { env } from "../lib/env.js";
import { createFinnhubProvider } from "./finnhub.js";
import { createTwelveDataProvider } from "./twelvedata.js";
import type { MarketDataProvider } from "./types.js";

export type * from "./types.js";

export const marketData: MarketDataProvider = {
  ...createFinnhubProvider(env.FINNHUB_API_KEY),
  ...createTwelveDataProvider(env.TWELVEDATA_API_KEY),
};
