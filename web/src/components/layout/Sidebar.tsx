import Link from "next/link";
import { Suspense } from "react";
import { NavList, SidebarLinks } from "./SidebarLinks";

export const SIDEBAR_ID = "app-sidebar";

/** Hidden below md until MobileNavToggle sets data-open; static column from md up. */
export function Sidebar() {
  return (
    <aside
      id={SIDEBAR_ID}
      className="fixed inset-y-0 left-0 z-40 hidden w-64 max-w-[85vw] flex-col border-r border-border bg-sidebar shadow-[0_8px_24px_oklch(0_0_0/0.18)] data-open:flex md:sticky md:top-0 md:flex md:h-dvh md:shadow-none"
    >
      <div className="flex h-14 shrink-0 items-center px-5">
        <Link href="/" className="flex items-center gap-2 text-[15px] font-semibold tracking-tight">
          <svg aria-hidden="true" viewBox="0 0 24 24" className="size-5 text-accent" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 19V11m5.5 8V5m5.5 14v-6m5 6V8" />
          </svg>
          Stock Insights
        </Link>
      </div>
      <nav aria-label="Principal" className="flex-1 overflow-y-auto px-3 pb-4">
        <Suspense fallback={<NavList pathname={null} />}>
          <SidebarLinks />
        </Suspense>
      </nav>
    </aside>
  );
}
