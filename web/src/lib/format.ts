const LOCALE = "es-MX";
const EMPTY = "—";

type Value = number | null | undefined;

const twoDecimals = { minimumFractionDigits: 2, maximumFractionDigits: 2 } as const;
const numberFormat = new Intl.NumberFormat(LOCALE, twoDecimals);
const changeFormat = new Intl.NumberFormat(LOCALE, { ...twoDecimals, signDisplay: "exceptZero" });
const capFormat = new Intl.NumberFormat(LOCALE, { maximumFractionDigits: 2 });
const percentFormat = new Intl.NumberFormat(LOCALE, { style: "percent", ...twoDecimals });
const signedPercentFormat = new Intl.NumberFormat(LOCALE, { style: "percent", ...twoDecimals, signDisplay: "exceptZero" });
// Market time, not the browser's: Server Components render in UTC on Vercel and output stays deterministic.
const quoteTimeFormat = new Intl.DateTimeFormat(LOCALE, {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "America/New_York",
});

const isEmpty = (v: Value): v is null | undefined => v === null || v === undefined || Number.isNaN(v);

export function formatCurrency(v: Value, currency = "USD"): string {
  if (isEmpty(v)) return EMPTY;
  return new Intl.NumberFormat(LOCALE, { style: "currency", currency, currencyDisplay: "narrowSymbol" }).format(v);
}

export function formatChange(v: Value): string {
  return isEmpty(v) ? EMPTY : changeFormat.format(v);
}

/** `points` are percentage points: 1.23 = 1.23 %. */
export function formatPercent(points: Value, { signed = false }: { signed?: boolean } = {}): string {
  if (isEmpty(points)) return EMPTY;
  return (signed ? signedPercentFormat : percentFormat).format(points / 100);
}

/** Not `notation: "compact"`: in es-MX it prints "2.95 B" (Spanish billón) for trillions. */
export function formatMarketCap(millions: Value): string {
  if (isEmpty(millions)) return EMPTY;
  if (millions >= 1_000_000) return `${capFormat.format(millions / 1_000_000)} T`;
  if (millions >= 1_000) return `${capFormat.format(millions / 1_000)} B`;
  return `${capFormat.format(millions)} M`;
}

export function formatNumber(v: Value): string {
  return isEmpty(v) ? EMPTY : numberFormat.format(v);
}

export function formatQuoteTime(unixSeconds: Value): string {
  return isEmpty(unixSeconds) ? EMPTY : quoteTimeFormat.format(new Date(unixSeconds * 1000));
}
