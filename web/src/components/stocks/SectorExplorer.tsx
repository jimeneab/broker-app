import Link from "next/link";
import { SECTORS } from "@/lib/sectors";
import { TypeBadge } from "./TypeBadge";

/** Static catalog, no API: plain cards with real h3s (a <details>/<summary> would hide them from heading navigation). */
export function SectorExplorer() {
  return (
    <section aria-labelledby="sector-explorer" className="flex flex-col gap-4">
      <h2 id="sector-explorer" className="text-lg font-semibold tracking-tight">
        Explorar por sector
      </h2>
      <div className="grid gap-3 md:grid-cols-2">
        {SECTORS.map((sector) => (
          <div key={sector.id} className="rounded-lg border border-border bg-surface">
            <h3 className="px-4 pt-3 pb-2 text-sm font-semibold">{sector.title}</h3>
            <ul className="divide-y divide-border">
              {sector.entries.map(({ symbol, name, type }) => (
                <li key={symbol}>
                  {/* Same row as SearchResults' ResultList. */}
                  <Link
                    href={`/stocks/${symbol}`}
                    className="flex min-h-12 items-center gap-4 px-4 py-2.5 text-sm transition-colors hover:bg-border/40 focus-visible:-outline-offset-2"
                  >
                    <span className="w-16 shrink-0 font-semibold">{symbol}</span>
                    <span className="min-w-0 flex-1 truncate text-muted">{name}</span>
                    <TypeBadge type={type} />
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <p className="text-sm text-muted">Lista de ejemplo para explorar; no es recomendación de inversión.</p>
    </section>
  );
}
