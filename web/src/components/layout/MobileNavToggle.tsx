"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Opens the server-rendered sidebar (by id) as a panel below md. It toggles a data-open attribute
 * instead of owning the sidebar, so the sidebar stays a Server Component.
 */
export function MobileNavToggle({ controls }: { controls: string }) {
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const sidebar = document.getElementById(controls);
    if (!sidebar) return;
    sidebar.toggleAttribute("data-open", open);
    if (!open) return;

    sidebar.querySelector<HTMLElement>("a")?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setOpen(false);
      buttonRef.current?.focus();
    };
    // Navigating from the panel closes it.
    const onClick = (event: MouseEvent) => {
      if ((event.target as Element).closest("a")) setOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    sidebar.addEventListener("click", onClick);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      sidebar.removeEventListener("click", onClick);
    };
  }, [open, controls]);

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        aria-expanded={open}
        aria-controls={controls}
        aria-label={open ? "Cerrar menú" : "Abrir menú"}
        onClick={() => setOpen((value) => !value)}
        className="-ml-2 inline-flex size-10 items-center justify-center rounded-md text-foreground hover:bg-border/60 md:hidden"
      >
        <svg aria-hidden="true" viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round">
          <path d="M4 7h16M4 12h16M4 17h16" />
        </svg>
      </button>
      {open && (
        // Scrim: tapping outside the panel closes it.
        <div data-testid="nav-scrim" aria-hidden="true" onClick={() => setOpen(false)} className="fixed inset-0 z-30 bg-black/40 md:hidden" />
      )}
    </>
  );
}
