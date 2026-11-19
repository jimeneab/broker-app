import type { Metadata } from "next";
import { Suspense } from "react";
import { StockOverview } from "@/components/stocks/StockOverview";
import { LoadingState } from "@/components/states/LoadingState";
import { normalizeSymbol } from "@/lib/stocks";

export async function generateMetadata({ params }: PageProps<"/stocks/[symbol]">): Promise<Metadata> {
  // No API call: the title must not spend provider quota.
  const symbol = normalizeSymbol((await params).symbol);
  return { title: `${symbol ?? "Stock"} · Stock Insights` };
}

export default function StockPage({ params }: PageProps<"/stocks/[symbol]">) {
  return (
    <div className="mx-auto max-w-5xl">
      <Suspense fallback={<LoadingState label="Cargando stock…" rows={5} />}>
        <StockOverview params={params} />
      </Suspense>
    </div>
  );
}
