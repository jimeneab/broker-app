import Link from "next/link";
import { EmptyState } from "@/components/states/EmptyState";
import { ErrorState } from "@/components/states/ErrorState";
import { api, ApiError, errorMessage, type StockDetail } from "@/lib/api";
import { normalizeSymbol } from "@/lib/stocks";
import { getServerAccessToken } from "@/lib/supabase/server";
import { PriceChart } from "./PriceChart";
import { StockHeader } from "./StockHeader";
import { StockMetrics } from "./StockMetrics";
import { StockTabs } from "./StockTabs";

/** Inline instead of notFound(): after streaming starts the status stays 200 anyway, and this keeps a useful next step. */
function SymbolNotFound({ raw }: { raw: string }) {
  const label = raw.trim().toUpperCase();
  return (
    <EmptyState
      title={`No encontramos el símbolo ${label}`}
      description="Revisa que esté bien escrito o búscalo por nombre."
      action={
        <Link href={`/search?q=${encodeURIComponent(label)}`} className="text-sm font-medium underline">
          Buscar «{label}»
        </Link>
      }
    />
  );
}

export async function StockOverview({ params }: { params: Promise<{ symbol: string }> }) {
  const raw = (await params).symbol;
  const symbol = normalizeSymbol(raw);
  if (!symbol) return <SymbolNotFound raw={raw} />;

  let data: StockDetail;
  try {
    data = await api.stock(symbol, { token: await getServerAccessToken() });
  } catch (err) {
    if (err instanceof ApiError && (err.code === "SYMBOL_NOT_FOUND" || err.code === "VALIDATION_ERROR")) {
      return <SymbolNotFound raw={symbol} />;
    }
    return <ErrorState message={errorMessage(err)} />;
  }

  return (
    <div className="flex flex-col gap-8">
      <StockHeader data={data} />
      <StockTabs>
        <PriceChart symbol={data.symbol} />
        <StockMetrics data={data} />
      </StockTabs>
    </div>
  );
}
