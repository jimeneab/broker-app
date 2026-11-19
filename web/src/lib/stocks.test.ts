import { describe, expect, it } from "vitest";
import { DEFAULT_RANGE, normalizeSymbol, STOCK_RANGES } from "./stocks";

describe("normalizeSymbol", () => {
  it("uppercases and trims valid symbols", () => {
    expect(normalizeSymbol("aapl")).toBe("AAPL");
    expect(normalizeSymbol(" brk.b ")).toBe("BRK.B");
  });

  it.each(["AAPL1", "TOOLONG", "AAPL.MX", "BRK-B", ""])("returns null for %j", (raw) => {
    expect(normalizeSymbol(raw)).toBeNull();
  });
});

describe("ranges", () => {
  it("has 4 ranges and defaults to 6M", () => {
    expect(STOCK_RANGES.map((r) => r.value)).toEqual(["1M", "6M", "1Y", "5Y"]);
    expect(DEFAULT_RANGE).toBe("6M");
  });
});
