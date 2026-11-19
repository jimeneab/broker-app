"use client";

import Form from "next/form";
import { useRouter } from "next/navigation";
import { useEffect, useState, type KeyboardEvent } from "react";
import { api, errorMessage, type StockSearchResult } from "@/lib/api";
import { getBrowserAccessToken } from "@/lib/supabase/client";
import { TypeBadge } from "./TypeBadge";

const DEBOUNCE_MS = 300;
const MAX_QUERY = 50;
const LISTBOX_ID = "header-search-listbox";
const optionId = (i: number) => `header-search-opt-${i}`;

type Status = "idle" | "loading" | "ready" | "error";

/** Search combobox (ARIA 1.2 pattern). Enter without an active option is handled by <Form>, so it works without JS. */
export function HeaderSearch() {
  const router = useRouter();
  const [text, setText] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [results, setResults] = useState<StockSearchResult[]>([]);
  const [error, setError] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);

  const query = text.trim().slice(0, MAX_QUERY);

  useEffect(() => {
    if (!query) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setStatus("loading");
      setOpen(true);
      try {
        const token = await getBrowserAccessToken();
        const data = await api.searchStocks(query, { token, signal: controller.signal });
        if (controller.signal.aborted) return;
        setResults(data.results);
        setActive(-1);
        setStatus("ready");
      } catch (err) {
        if (controller.signal.aborted) return;
        setError(errorMessage(err));
        setStatus("error");
      }
    }, DEBOUNCE_MS);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  function onChange(value: string) {
    setText(value);
    if (!value.trim()) {
      setOpen(false);
      setStatus("idle");
      setResults([]);
    }
  }

  function go(symbol: string) {
    router.push(`/stocks/${symbol}`);
    onChange("");
    setActive(-1);
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    const count = status === "ready" ? results.length : 0;
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      if (!count) return;
      e.preventDefault();
      setOpen(true);
      setActive((a) => (e.key === "ArrowDown" ? (a + 1) % count : a <= 0 ? count - 1 : a - 1));
    } else if (e.key === "Enter" && open && active >= 0 && results[active]) {
      e.preventDefault();
      go(results[active].symbol);
    } else if (e.key === "Escape") {
      setOpen(false);
      setActive(-1);
    }
  }

  const expanded = open && status !== "idle";
  const showOptions = expanded && status === "ready" && results.length > 0;

  return (
    <Form action="/search" role="search" className="relative w-full">
      <label className="sr-only" htmlFor="header-search">
        Buscar acciones o ETFs
      </label>
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
      >
        <path d="M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zm9.5 2.5-4.5-4.5" />
      </svg>
      <input
        id="header-search"
        name="q"
        type="search"
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={expanded}
        aria-controls={LISTBOX_ID}
        aria-activedescendant={showOptions && active >= 0 ? optionId(active) : undefined}
        autoComplete="off"
        maxLength={MAX_QUERY}
        placeholder="Buscar símbolo o empresa"
        value={text}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onKeyDown}
        onFocus={() => query && setOpen(true)}
        onBlur={() => setOpen(false)}
        className="h-9 w-full min-w-0 rounded-md border border-border bg-surface pr-3 pl-9 text-sm transition-colors placeholder:text-muted hover:border-muted/60 [&::-webkit-search-cancel-button]:hidden"
      />

      <div
        hidden={!expanded}
        className="absolute top-full right-0 left-0 z-30 mt-1.5 overflow-hidden rounded-lg border border-border bg-surface shadow-[0_8px_24px_-12px_oklch(0.2_0.02_255/0.35)]"
      >
        {status === "loading" && <p className="px-3 py-2.5 text-sm text-muted">Buscando…</p>}
        {status === "error" && <p className="px-3 py-2.5 text-sm text-down">{error}</p>}
        {status === "ready" && results.length === 0 && <p className="px-3 py-2.5 text-sm text-muted">Sin resultados</p>}
        <ul id={LISTBOX_ID} role="listbox" aria-label="Sugerencias" hidden={!showOptions} className="max-h-80 overflow-y-auto py-1">
          {results.map((r, i) => (
            <li
              key={r.symbol}
              id={optionId(i)}
              role="option"
              aria-selected={i === active}
              onMouseDown={(e) => e.preventDefault()}
              onMouseEnter={() => setActive(i)}
              onClick={() => go(r.symbol)}
              className="flex cursor-pointer items-center gap-3 px-3 py-2 text-sm aria-selected:bg-accent-soft"
            >
              <span className="w-14 shrink-0 font-medium">{r.symbol}</span>
              <span className="min-w-0 flex-1 truncate text-muted">{r.name}</span>
              <TypeBadge type={r.type} />
            </li>
          ))}
        </ul>
      </div>
      <p role="status" className="sr-only">
        {status === "ready" ? (results.length ? `${results.length} resultados` : "Sin resultados") : ""}
      </p>
    </Form>
  );
}
