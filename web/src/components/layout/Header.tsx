import { Suspense } from "react";
import { MobileNavToggle } from "./MobileNavToggle";
import { SIDEBAR_ID } from "./Sidebar";
import { UserMenu, UserMenuFallback } from "./UserMenu";

export function Header() {
  return (
    <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center gap-3 border-b border-border bg-background px-4 md:px-8">
      <MobileNavToggle controls={SIDEBAR_ID} />
      {/* F03 mounts the search autocomplete here; width reserved so the header does not shift. */}
      <div data-slot="search" className="h-9 min-w-0 max-w-md flex-1" />
      <div className="ml-auto">
        <Suspense fallback={<UserMenuFallback />}>
          <UserMenu />
        </Suspense>
      </div>
    </header>
  );
}
