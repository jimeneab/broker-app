"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { parseRecent, RECENT_KEY } from "@/lib/recent";
import { SYMBOL_CHIP_CLASS } from "./PopularSymbols";

/** Starts empty so server HTML and first client render match; storage is read after hydration. */
export function RecentSymbols() {
  const [symbols, setSymbols] = useState<string[]>([]);

  useEffect(() => {
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reads an external system (localStorage) only after hydration
      setSymbols(parseRecent(localStorage.getItem(RECENT_KEY)));
    } catch {
      // Blocked storage: hide the block silently.
    }
  }, []);

  function clear() {
    try {
      localStorage.removeItem(RECENT_KEY);
    } catch {
      // Still hide it in this view.
    }
    setSymbols([]);
    // The button disappears; keep keyboard users on the search box instead of <body>.
    document.getElementById("search-page-q")?.focus();
  }

  if (!symbols.length) return null;

  return (
    <nav aria-label="Vistos recientemente" className="flex flex-wrap items-center gap-x-3 gap-y-2">
      <span className="text-sm text-muted">Vistos recientemente</span>
      <ul className="flex flex-wrap gap-2">
        {symbols.map((symbol) => (
          <li key={symbol}>
            <Link href={`/stocks/${symbol}`} className={SYMBOL_CHIP_CLASS}>
              {symbol}
            </Link>
          </li>
        ))}
      </ul>
      <button
        type="button"
        onClick={clear}
        aria-label="Borrar vistos recientemente"
        className="text-sm text-muted underline-offset-2 hover:underline"
      >
        Borrar
      </button>
    </nav>
  );
}
