import { describe, expect, it } from "vitest";
import { SECTORS } from "./sectors";
import { normalizeSymbol } from "./stocks";

const entries = SECTORS.flatMap((s) => s.entries);

describe("SECTORS", () => {
  it("has the 6 sectors in order", () => {
    expect(SECTORS.map((s) => s.title)).toEqual(["Tecnología", "Finanzas", "Salud", "Consumo", "Energía", "ETFs"]);
  });

  it("has the 28 symbols in order", () => {
    expect(entries.map((e) => e.symbol)).toEqual([
      "AAPL", "MSFT", "NVDA", "GOOGL", "META",
      "JPM", "V", "MA", "BAC", "GS",
      "JNJ", "UNH", "LLY", "PFE", "ABBV",
      "KO", "PG", "WMT", "MCD", "NKE",
      "XOM", "CVX", "COP",
      "SPY", "QQQ", "DIA", "VTI", "VOO",
    ]);
  });

  it("uses valid normalized symbols with names, no repeats per sector", () => {
    for (const e of entries) {
      expect(normalizeSymbol(e.symbol)).toBe(e.symbol);
      expect(e.name.trim()).not.toBe("");
    }
    for (const s of SECTORS) expect(new Set(s.entries.map((e) => e.symbol)).size).toBe(s.entries.length);
  });

  it("types ETFs as etf and the rest as stock", () => {
    for (const s of SECTORS) for (const e of s.entries) expect(e.type).toBe(s.id === "etf" ? "etf" : "stock");
    expect(entries.filter((e) => e.type === "etf")).toHaveLength(5);
  });

  it("has unique ids", () => {
    expect(new Set(SECTORS.map((s) => s.id)).size).toBe(SECTORS.length);
  });
});
