import Form from "next/form";
import Link from "next/link";
import { EmptyState } from "@/components/states/EmptyState";
import { ErrorState } from "@/components/states/ErrorState";
import { api, errorMessage, type StockSearchResult } from "@/lib/api";
import { getServerAccessToken } from "@/lib/supabase/server";
import { SearchDiscovery } from "./SearchDiscovery";
import { TypeBadge } from "./TypeBadge";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

/** Page search form, also used as the Suspense fallback. No autocomplete here: that is HeaderSearch's job. */
export function SearchForm({ q }: { q: string }) {
  return (
    <Form action="/search" role="search" className="flex gap-2">
      <label className="sr-only" htmlFor="search-page-q">
        Buscar acciones o ETFs
      </label>
      <input
        key={q}
        id="search-page-q"
        name="q"
        type="search"
        defaultValue={q}
        maxLength={50}
        autoComplete="off"
        placeholder="Nombre o símbolo, por ejemplo Apple o AAPL"
        className="h-10 w-full min-w-0 flex-1 rounded-md border border-border bg-surface px-3 text-[15px] transition-colors placeholder:text-muted hover:border-muted/60"
      />
      <button
        type="submit"
        className="inline-flex h-10 shrink-0 items-center justify-center rounded-md bg-foreground px-4 text-sm font-medium text-background transition-opacity hover:opacity-90"
      >
        Buscar
      </button>
    </Form>
  );
}

export function SearchHint() {
  return <p className="text-sm text-muted">Busca por nombre (Apple) o por símbolo (AAPL). Solo acciones y ETFs de EE. UU.</p>;
}

function ResultList({ results }: { results: StockSearchResult[] }) {
  return (
    <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-surface">
      {results.map((r) => (
        <li key={r.symbol}>
          <Link
            href={`/stocks/${r.symbol}`}
            className="flex min-h-12 items-center gap-4 px-4 py-2.5 text-sm transition-colors hover:bg-border/40 focus-visible:-outline-offset-2"
          >
            <span className="w-16 shrink-0 font-semibold">{r.symbol}</span>
            <span className="min-w-0 flex-1 truncate text-muted">{r.name}</span>
            <TypeBadge type={r.type} />
          </Link>
        </li>
      ))}
    </ul>
  );
}

export async function SearchResults({ searchParams }: { searchParams: SearchParams }) {
  const raw = (await searchParams).q;
  const q = (Array.isArray(raw) ? raw[0] : raw)?.trim().slice(0, 50) ?? "";

  let results: StockSearchResult[] = [];
  let error: string | null = null;
  if (q) {
    try {
      ({ results } = await api.searchStocks(q, { token: await getServerAccessToken() }));
    } catch (err) {
      error = errorMessage(err);
    }
  }

  let body;
  if (!q) {
    body = <SearchDiscovery />;
  } else if (error) {
    body = <ErrorState message={error} />;
  } else if (!results.length) {
    body = (
      <EmptyState title={`Sin resultados para «${q}»`} description="Prueba con el símbolo (AAPL) o con otra parte del nombre." />
    );
  } else {
    body = (
      <>
        <p className="text-sm text-muted">
          {results.length === 1 ? "1 resultado" : `${results.length} resultados`} para «{q}»
        </p>
        <ResultList results={results} />
      </>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <SearchForm q={q} />
      <SearchHint />
      {body}
    </div>
  );
}
