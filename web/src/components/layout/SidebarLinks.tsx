"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { isActive, navItems } from "./nav-items";

function NavIcon({ d }: { d: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="size-5 shrink-0"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={d} />
    </svg>
  );
}

const itemClass = "flex min-h-10 items-center gap-3 rounded-md px-3 text-sm";

/** Pure list, also used as the Suspense fallback (pathname = null: nothing active, same layout). */
export function NavList({ pathname }: { pathname: string | null }) {
  return (
    <ul className="flex flex-col gap-0.5">
      {navItems.map((item) => {
        if (!item.available) {
          return (
            <li key={item.href}>
              <span aria-disabled="true" className={`${itemClass} cursor-not-allowed text-muted`}>
                <NavIcon d={item.icon} />
                <span className="min-w-0 flex-1 truncate">{item.label}</span>
                <span className="shrink-0 rounded border border-border px-1.5 py-0.5 text-[11px] leading-none">
                  Próximamente
                </span>
              </span>
            </li>
          );
        }
        const active = isActive(item.href, pathname);
        return (
          <li key={item.href}>
            <Link
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={`${itemClass} transition-colors duration-150 ${
                active
                  ? "bg-accent-soft font-medium text-accent"
                  : "text-foreground hover:bg-border/60"
              }`}
            >
              <NavIcon d={item.icon} />
              <span className="truncate">{item.label}</span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

export function SidebarLinks() {
  return <NavList pathname={usePathname()} />;
}
