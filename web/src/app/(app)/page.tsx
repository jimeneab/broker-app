import type { Metadata } from "next";
import { Suspense } from "react";
import { ComingSoon } from "@/components/home/ComingSoon";
import { Greeting, GreetingSkeleton } from "@/components/home/Greeting";
import { MarketToday } from "@/components/home/MarketToday";
import { IdeasSkeleton, ProfileIdeas } from "@/components/home/ProfileIdeas";
import { PopularSymbols } from "@/components/stocks/PopularSymbols";
import { SearchForm } from "@/components/stocks/SearchResults";

export const metadata: Metadata = { title: "Home · Stock Insights" };

/** Sync shell: search, Populares and Próximamente prerender; each data block streams in its own Suspense. */
export default function Home() {
  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-10">
      <Suspense fallback={<GreetingSkeleton />}>
        <Greeting />
      </Suspense>
      <section aria-label="Buscar" className="flex flex-col gap-3">
        <SearchForm q="" />
        <PopularSymbols />
      </section>
      <MarketToday />
      <Suspense fallback={<IdeasSkeleton />}>
        <ProfileIdeas />
      </Suspense>
      <ComingSoon />
    </div>
  );
}
