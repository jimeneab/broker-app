import { Suspense, type ReactNode } from "react";
import { ideasFor } from "@/lib/home";
import { getMe } from "@/lib/me";
import { RISK_PROFILES } from "@/lib/risk/questions";
import { QuoteCard, QuoteCardSkeleton } from "./QuoteCard";

const gridClass = "grid gap-3 sm:grid-cols-2 lg:grid-cols-4";

function IdeasSection({ subtitle, children }: { subtitle: ReactNode; children: ReactNode }) {
  return (
    <section aria-labelledby="profile-ideas" className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 id="profile-ideas" className="text-lg font-semibold tracking-tight">
          Ideas para tu perfil
        </h2>
        {subtitle}
      </div>
      <div className={gridClass}>{children}</div>
    </section>
  );
}

export async function ProfileIdeas() {
  const profile = (await getMe())?.riskProfile ?? null;
  const subtitle = profile
    ? `Selección de ejemplo según tu perfil ${RISK_PROFILES[profile].label}. No es recomendación de inversión.`
    : "Selección de ejemplo. No es recomendación de inversión.";

  return (
    <IdeasSection subtitle={<p className="text-sm text-muted">{subtitle}</p>}>
      {ideasFor(profile).map((symbol) => (
        <Suspense key={symbol} fallback={<QuoteCardSkeleton />}>
          <QuoteCard symbol={symbol} showCompany />
        </Suspense>
      ))}
    </IdeasSection>
  );
}

export function IdeasSkeleton() {
  return (
    <IdeasSection
      subtitle={
        <div aria-hidden="true" className="flex h-5 items-center">
          <div className="h-3.5 w-80 max-w-full rounded bg-skeleton motion-safe:animate-pulse" />
        </div>
      }
    >
      {Array.from({ length: 4 }, (_, i) => (
        <QuoteCardSkeleton key={i} />
      ))}
    </IdeasSection>
  );
}
