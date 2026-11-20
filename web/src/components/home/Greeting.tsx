import Link from "next/link";
import { getMe } from "@/lib/me";
import { RISK_PROFILES } from "@/lib/risk/questions";

/** Decorative: if /me fails it degrades to "Hola" without an error, and the rest of the Home keeps working. */
export async function Greeting() {
  const me = await getMe();
  const profile = me?.riskProfile ? RISK_PROFILES[me.riskProfile] : null;

  return (
    <header className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">{me?.displayName ? `Hola, ${me.displayName}` : "Hola"}</h1>
        {profile && (
          <span className="shrink-0 rounded border border-border px-1.5 py-0.5 text-[11px] leading-none text-muted">
            {profile.label}
          </span>
        )}
      </div>
      {profile && (
        <>
          <p className="max-w-[65ch] text-muted">{profile.description}</p>
          <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
            {me?.riskScore != null && <span>Puntaje {me.riskScore} de 24</span>}
            <Link href="/onboarding" className="text-muted underline-offset-4 hover:text-foreground hover:underline">
              Rehacer cuestionario
            </Link>
          </p>
        </>
      )}
    </header>
  );
}

/** Takes the height of the greeting with a profile, so the page does not jump when it arrives. */
export function GreetingSkeleton() {
  return (
    <div aria-busy="true" className="flex flex-col gap-2">
      <span className="sr-only">Cargando…</span>
      <div aria-hidden="true" className="h-8 w-48 rounded bg-skeleton motion-safe:animate-pulse" />
      <div aria-hidden="true" className="h-12 w-full max-w-[65ch] rounded bg-skeleton motion-safe:animate-pulse" />
      <div aria-hidden="true" className="h-5 w-56 rounded bg-skeleton motion-safe:animate-pulse" />
    </div>
  );
}
