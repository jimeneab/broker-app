import { describe, expect, it } from "vitest";
import { MARKET_INDEXES, ideasFor } from "./home";

describe("home lists", () => {
  it("picks the ideas by risk profile and falls back to moderado", () => {
    expect(ideasFor("conservador")).toEqual(["KO", "JNJ", "PG", "VTI"]);
    expect(ideasFor("moderado")).toEqual(["AAPL", "MSFT", "V", "QQQ"]);
    expect(ideasFor("agresivo")).toEqual(["NVDA", "TSLA", "AMD", "META"]);
    expect(ideasFor(null)).toEqual(["AAPL", "MSFT", "V", "QQQ"]);
  });

  it("lists the market indexes in order", () => {
    expect(MARKET_INDEXES).toEqual([
      { symbol: "SPY", name: "S&P 500" },
      { symbol: "QQQ", name: "Nasdaq 100" },
      { symbol: "DIA", name: "Dow Jones" },
    ]);
  });
});
