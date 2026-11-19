import type { ReactNode } from "react";

const tabClass = "-mb-px inline-flex h-10 shrink-0 items-center gap-2 border-b-2 px-1 text-sm";

/** Server in F03: only Resumen has content. F05/F08 enable their tab and turn this into a Client Component. */
export function StockTabs({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col gap-6">
      <div role="tablist" aria-label="Secciones del stock" className="flex gap-6 overflow-x-auto border-b border-border">
        <button
          type="button"
          role="tab"
          id="tab-resumen"
          aria-selected="true"
          aria-controls="panel-resumen"
          className={`${tabClass} border-accent font-medium text-foreground`}
        >
          Resumen
        </button>
        {["Técnico", "Noticias"].map((label) => (
          <button
            key={label}
            type="button"
            role="tab"
            aria-selected="false"
            aria-disabled="true"
            disabled
            className={`${tabClass} cursor-not-allowed border-transparent text-muted`}
          >
            {label}
            <span className="rounded border border-border px-1.5 py-0.5 text-[11px] leading-none">Próximamente</span>
          </button>
        ))}
      </div>
      <div role="tabpanel" id="panel-resumen" aria-labelledby="tab-resumen" className="flex flex-col gap-8">
        {children}
      </div>
    </div>
  );
}
