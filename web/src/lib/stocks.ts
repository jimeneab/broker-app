// Same format as symbolSchema in the API (02-backend, F03).
export const SYMBOL_PATTERN = /^[A-Z]{1,5}(\.[A-Z])?$/;

/** trim + uppercase; null when it is not a US symbol, so garbage never reaches the API. */
export function normalizeSymbol(raw: string): string | null {
  const symbol = raw.trim().toUpperCase();
  return SYMBOL_PATTERN.test(symbol) ? symbol : null;
}

export type StockRange = "1M" | "6M" | "1Y" | "5Y";

export const STOCK_RANGES: readonly { value: StockRange; label: string; long: string }[] = [
  { value: "1M", label: "1M", long: "1 mes" },
  { value: "6M", label: "6M", long: "6 meses" },
  { value: "1Y", label: "1A", long: "1 año" },
  { value: "5Y", label: "5A", long: "5 años" },
];

export const DEFAULT_RANGE: StockRange = "6M";
