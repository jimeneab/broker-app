import Link from "next/link";

export const POPULAR_SYMBOLS = ["AAPL", "MSFT", "NVDA", "TSLA", "AMZN", "GOOGL", "SPY"] as const;

export function PopularSymbols() {
  return (
    <nav aria-label="Populares" className="flex flex-wrap items-center gap-x-3 gap-y-2">
      <span className="text-sm text-muted">Populares</span>
      <ul className="flex flex-wrap gap-2">
        {POPULAR_SYMBOLS.map((symbol) => (
          <li key={symbol}>
            <Link
              href={`/stocks/${symbol}`}
              className="inline-flex h-8 items-center rounded-md border border-border bg-surface px-3 text-sm font-medium transition-colors hover:border-muted/60 hover:bg-border/40"
            >
              {symbol}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
