import type { StockSearchResult } from "@/lib/api";

const TYPE_LABEL: Record<StockSearchResult["type"], string> = { stock: "Acción", etf: "ETF" };

/** Neutral badge, same shape as the sidebar's "Próximamente": the type is metadata, not status. */
export function TypeBadge({ type }: { type: StockSearchResult["type"] }) {
  return (
    <span className="shrink-0 rounded border border-border px-1.5 py-0.5 text-[11px] leading-none text-muted">
      {TYPE_LABEL[type]}
    </span>
  );
}
