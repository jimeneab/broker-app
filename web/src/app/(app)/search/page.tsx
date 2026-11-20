import type { Metadata } from "next";
import { Suspense } from "react";
import { SearchForm, SearchHint, SearchResults } from "@/components/stocks/SearchResults";
import { LoadingState } from "@/components/states/LoadingState";

export const metadata: Metadata = { title: "Buscar · Stock Insights" };

export default function SearchPage({ searchParams }: PageProps<"/search">) {
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <h1 className="text-2xl font-semibold tracking-tight">Buscar</h1>
      <Suspense
        fallback={
          <div className="flex flex-col gap-4">
            <SearchForm q="" />
            <SearchHint />
            <LoadingState label="Buscando…" />
          </div>
        }
      >
        <SearchResults searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
