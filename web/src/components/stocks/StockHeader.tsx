import type { StockDetail } from "@/lib/api";
import { formatChange, formatCurrency, formatPercent, formatQuoteTime } from "@/lib/format";

/** Drawn triangle, not a glyph, so it matches the icon stroke system. Color is never the only signal. */
function Trend({ up }: { up: boolean }) {
  return (
    <>
      <svg aria-hidden="true" viewBox="0 0 10 10" className={`size-2.5 fill-current ${up ? "" : "rotate-180"}`}>
        <path d="M5 1.5 9 8.5H1z" />
      </svg>
      <span className="sr-only">{up ? "Sube" : "Baja"}</span>
    </>
  );
}

export function StockHeader({ data }: { data: StockDetail }) {
  const { symbol, quote, profile } = data;
  const change = quote.change ?? 0;
  const tone = change > 0 ? "text-up" : change < 0 ? "text-down" : "text-muted";

  return (
    <header className="flex flex-col gap-5">
      <div className="flex items-start gap-3">
        {profile?.logoUrl && (
          // A 40 px icon from an external domain: next/image optimization adds nothing here.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={profile.logoUrl}
            alt=""
            width={40}
            height={40}
            className="size-10 shrink-0 rounded-md border border-border bg-surface object-contain"
          />
        )}
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-semibold tracking-tight text-balance">{profile?.name ?? symbol}</h1>
          <p className="mt-0.5 truncate text-sm text-muted">
            <span className="font-medium text-foreground">{symbol}</span>
            {profile?.exchange && <> · {profile.exchange}</>}
          </p>
        </div>
        {/* F04 mounts the favorite star here. */}
        <div data-slot="favorite" />
      </div>

      <div>
        <p className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <span className="text-4xl font-semibold tracking-tight">{formatCurrency(quote.price)}</span>
          <span data-testid="price-change" className={`inline-flex items-center gap-1.5 text-base font-medium ${tone}`}>
            {change !== 0 && <Trend up={change > 0} />}
            {formatChange(quote.change)} ({formatPercent(quote.changePercent, { signed: true })})
          </span>
        </p>
        <p className="mt-1.5 text-sm text-muted">Precio al {formatQuoteTime(quote.timestamp)} (hora de Nueva York)</p>
      </div>
    </header>
  );
}
