import Link from "next/link";
import { Trend, changeTone } from "@/components/stocks/Trend";
import { api, type StockDetail } from "@/lib/api";
import { formatChange, formatCurrency, formatPercent } from "@/lib/format";
import { getServerAccessToken } from "@/lib/supabase/server";

// Fixed height so skeleton, data and "No disponible" occupy the same box and the grid never jumps.
const cardClass = "flex h-32 flex-col justify-between rounded-lg border border-border bg-surface p-4";

type Props = { symbol: string; name?: string; showCompany?: boolean };

export async function QuoteCard({ symbol, name, showCompany = false }: Props) {
  let data: StockDetail | null = null;
  try {
    data = await api.stock(symbol, { token: await getServerAccessToken() });
  } catch {
    // Any failure (404, provider down or rate limited, API down) degrades only this card.
  }

  const title = name ?? (showCompany ? (data?.profile?.name ?? symbol) : symbol);
  const logoUrl = showCompany ? data?.profile?.logoUrl : null;
  const change = data?.quote.change ?? null;

  return (
    <Link href={`/stocks/${symbol}`} className={`${cardClass} transition-colors hover:border-muted/60 hover:bg-border/20`}>
      <div className="flex min-w-0 items-center gap-3">
        {logoUrl && (
          // A 32 px icon from an external domain: next/image optimization adds nothing here.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={logoUrl}
            alt=""
            width={32}
            height={32}
            className="size-8 shrink-0 rounded-md border border-border bg-surface object-contain"
          />
        )}
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{title}</p>
          <p className="truncate text-xs text-muted">{symbol}</p>
        </div>
      </div>
      {data ? (
        <div>
          <p className="text-xl font-semibold tracking-tight tabular-nums">{formatCurrency(data.quote.price)}</p>
          <p data-testid="quote-change" className={`inline-flex items-center gap-1.5 text-sm font-medium ${changeTone(change)}`}>
            {change !== null && change !== 0 && <Trend up={change > 0} />}
            {formatChange(change)} ({formatPercent(data.quote.changePercent, { signed: true })})
          </p>
        </div>
      ) : (
        <p className="text-sm text-muted">No disponible</p>
      )}
    </Link>
  );
}

export function QuoteCardSkeleton() {
  return (
    <div aria-busy="true" className={cardClass}>
      <span className="sr-only">Cargando…</span>
      <div aria-hidden="true" className="h-4 w-2/3 rounded bg-skeleton motion-safe:animate-pulse" />
      <div aria-hidden="true" className="flex flex-col gap-2">
        <div className="h-6 w-1/2 rounded bg-skeleton motion-safe:animate-pulse" />
        <div className="h-4 w-1/3 rounded bg-skeleton motion-safe:animate-pulse" />
      </div>
    </div>
  );
}
