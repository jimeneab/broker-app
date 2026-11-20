const ITEMS = [
  { title: "Favoritos", description: "Guarda stocks para seguirlos de cerca." },
  { title: "Noticias", description: "Noticias del mercado y de tus empresas." },
  { title: "Simulador", description: "Practica con dinero ficticio y precios reales." },
] as const;

/** Announces F04/F05/F09 without links: nothing here is clickable, so there are no broken routes. */
export function ComingSoon() {
  return (
    <section aria-labelledby="coming-soon" className="flex flex-col gap-3">
      <h2 id="coming-soon" className="text-sm font-medium text-muted">
        Próximamente
      </h2>
      <ul className="grid gap-3 sm:grid-cols-3">
        {ITEMS.map(({ title, description }) => (
          <li key={title} className="rounded-lg border border-dashed border-border p-4 text-muted">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-medium">{title}</p>
              <span className="shrink-0 rounded border border-border px-1.5 py-0.5 text-[11px] leading-none">
                Próximamente
              </span>
            </div>
            <p className="mt-1 text-sm">{description}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
