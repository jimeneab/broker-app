import { Suspense } from "react";
import { MARKET_INDEXES } from "@/lib/home";
import { QuoteCard, QuoteCardSkeleton } from "./QuoteCard";

export function MarketToday({ title = "Mercado hoy" }: { title?: string }) {
  return (
    <section aria-labelledby="market-today" className="flex flex-col gap-4">
      <h2 id="market-today" className="text-lg font-semibold tracking-tight">
        {title}
      </h2>
      <div className="grid gap-3 sm:grid-cols-3">
        {MARKET_INDEXES.map(({ symbol, name }) => (
          <Suspense key={symbol} fallback={<QuoteCardSkeleton />}>
            <QuoteCard symbol={symbol} name={name} />
          </Suspense>
        ))}
      </div>
    </section>
  );
}
