import type { Metadata } from "next";
import { Suspense } from "react";
import { OnboardingExit } from "@/components/onboarding/OnboardingExit";
import { RiskQuestionnaire } from "@/components/onboarding/RiskQuestionnaire";

export const metadata: Metadata = { title: "Tu perfil de riesgo · Stock Insights" };

export default function OnboardingPage() {
  return (
    <>
      <h1 className="text-xl font-semibold tracking-tight text-balance">Tu perfil de riesgo</h1>
      <p className="mt-2 text-sm text-muted">Responde 6 preguntas rápidas. Usaremos tu perfil para personalizar la app.</p>
      <RiskQuestionnaire />
      {/* Reads cookies: required with cacheComponents. */}
      <Suspense fallback={null}>
        <OnboardingExit />
      </Suspense>
    </>
  );
}
