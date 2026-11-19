import type { ReactNode } from "react";
import type { StockDetail } from "@/lib/api";
import { formatCurrency, formatMarketCap, formatNumber, formatPercent } from "@/lib/format";

function hostname(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

export function StockMetrics({ data }: { data: StockDetail }) {
  const { quote, profile, metrics } = data;
  const cards: [string, string][] = [
    ["Apertura", formatCurrency(quote.open)],
    ["Cierre anterior", formatCurrency(quote.previousClose)],
    ["Máximo del día", formatCurrency(quote.high)],
    ["Mínimo del día", formatCurrency(quote.low)],
    ["Capitalización", formatMarketCap(profile?.marketCapMillions ?? metrics?.marketCapMillions)],
    ["P/E (TTM)", formatNumber(metrics?.peRatio)],
    ["Beta", formatNumber(metrics?.beta)],
    ["Máximo 52 semanas", formatCurrency(metrics?.week52High)],
    ["Mínimo 52 semanas", formatCurrency(metrics?.week52Low)],
    ["Rend. dividendo", formatPercent(metrics?.dividendYieldPercent)],
  ];
  const company: [string, ReactNode][] = [
    ["Sector", profile?.industry ?? "—"],
    ["País", profile?.country ?? "—"],
    ["Bolsa", profile?.exchange ?? "—"],
    [
      "Sitio web",
      profile?.website ? (
        <a
          href={profile.website}
          target="_blank"
          rel="noopener noreferrer"
          className="underline decoration-border hover:decoration-foreground"
        >
          {hostname(profile.website)}
        </a>
      ) : (
        "—"
      ),
    ],
  ];

  return (
    <div className="flex flex-col gap-8">
      <section aria-labelledby="metrics-heading" className="flex flex-col gap-3">
        <h2 id="metrics-heading" className="text-base font-semibold tracking-tight">
          Métricas clave
        </h2>
        {/* One panel split into cells: reads as a data sheet, not a wall of floating cards. */}
        <div className="overflow-hidden rounded-lg border border-border bg-surface">
          <dl className="-mr-px -mb-px grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {cards.map(([label, value]) => (
              <div key={label} className="flex min-w-0 flex-col gap-1 border-r border-b border-border px-4 py-3">
                <dt className="truncate text-xs text-muted">{label}</dt>
                <dd className="text-[15px] font-medium">{value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <section aria-labelledby="company-heading" className="flex flex-col gap-3">
        <h2 id="company-heading" className="text-base font-semibold tracking-tight">
          Empresa
        </h2>
        <dl className="grid grid-cols-1 gap-x-8 text-sm sm:grid-cols-2">
          {company.map(([label, value]) => (
            <div key={label} className="flex min-w-0 justify-between gap-4 border-b border-border py-2.5">
              <dt className="shrink-0 text-muted">{label}</dt>
              <dd className="min-w-0 truncate text-right">{value}</dd>
            </div>
          ))}
        </dl>
      </section>
    </div>
  );
}
