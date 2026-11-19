import { describe, expect, it } from "vitest";
import { formatChange, formatCurrency, formatMarketCap, formatNumber, formatPercent, formatQuoteTime } from "./format";

describe("format (es-MX)", () => {
  it("formatCurrency", () => {
    expect(formatCurrency(189.84)).toBe("$189.84");
    expect(formatCurrency(1234567.891)).toBe("$1,234,567.89");
  });

  it("formatChange", () => {
    expect(formatChange(2.31)).toBe("+2.31");
    expect(formatChange(-1.05)).toBe("-1.05");
    expect(formatChange(0)).toBe("0.00");
  });

  it("formatPercent takes percentage points", () => {
    expect(formatPercent(1.23, { signed: true })).toBe("+1.23%");
    expect(formatPercent(-0.45, { signed: true })).toBe("-0.45%");
    expect(formatPercent(0.51)).toBe("0.51%");
  });

  it("formatMarketCap uses T, B and M thresholds", () => {
    expect(formatMarketCap(2_950_000)).toBe("2.95 T");
    expect(formatMarketCap(1_000_000)).toBe("1 T");
    expect(formatMarketCap(3_400)).toBe("3.4 B");
    expect(formatMarketCap(1_000)).toBe("1 B");
    expect(formatMarketCap(812)).toBe("812 M");
  });

  it("formatNumber uses 2 decimals", () => {
    expect(formatNumber(29.4)).toBe("29.40");
  });

  it("formatQuoteTime uses New York time", () => {
    // 18:33 UTC = 13:33 in New York (EST).
    const out = formatQuoteTime(Date.UTC(2026, 10, 18, 18, 33) / 1000).replace(/\s/g, " ");
    expect(out).toBe("18 nov 2026, 1:33 p.m.");
  });

  it.each([formatCurrency, formatChange, formatPercent, formatMarketCap, formatNumber, formatQuoteTime])(
    "%o returns — for null and undefined",
    (fn) => {
      expect(fn(null)).toBe("—");
      expect(fn(undefined)).toBe("—");
    },
  );
});
