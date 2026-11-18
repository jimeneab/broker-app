import Link from "next/link";
import { logout } from "@/lib/auth/actions";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function Avatar() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round">
      <path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm-7.5 8.5a7.5 7.5 0 0 1 15 0" />
    </svg>
  );
}

const avatarClass =
  "inline-flex size-9 items-center justify-center rounded-full border border-border bg-surface text-muted";

/** Shown while the session loads (and without a session): generic avatar, not interactive. */
export function UserMenuFallback() {
  return (
    <span className={avatarClass}>
      <Avatar />
    </span>
  );
}

/** Reads cookies, so Header renders it inside <Suspense>. Works without JS via <details>. */
export async function UserMenu() {
  const { data } = await (await createSupabaseServerClient()).auth.getClaims();
  const email = data?.claims.email;
  if (typeof email !== "string" || !email) return <UserMenuFallback />;

  return (
    <details className="group relative">
      <summary
        aria-label="Menú de usuario"
        className={`${avatarClass} cursor-pointer list-none hover:text-foreground group-open:text-foreground [&::-webkit-details-marker]:hidden`}
      >
        <Avatar />
      </summary>
      <div className="absolute right-0 z-30 mt-2 w-64 max-w-[calc(100vw-2rem)] rounded-lg border border-border bg-surface p-1.5 shadow-[0_8px_24px_oklch(0_0_0/0.12)]">
        <p className="truncate px-2.5 py-2 text-sm text-muted" title={email}>
          {email}
        </p>
        <div className="my-1 border-t border-border" />
        <Link href="/onboarding" className="block w-full rounded-md px-2.5 py-2 text-left text-sm hover:bg-border/60">
          Rehacer cuestionario
        </Link>
        <form action={logout}>
          <button type="submit" className="w-full rounded-md px-2.5 py-2 text-left text-sm hover:bg-border/60">
            Cerrar sesión
          </button>
        </form>
      </div>
    </details>
  );
}
