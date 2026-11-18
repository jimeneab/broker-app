"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition, type FormEvent } from "react";
import { FormAlert } from "@/components/auth/AuthField";
import { submitRiskProfile } from "@/lib/risk/actions";
import { RISK_DISCLAIMER, RISK_PROFILES, RISK_QUESTIONS, type RiskProfile } from "@/lib/risk/questions";

const TOTAL = RISK_QUESTIONS.length;

const primaryClass =
  "inline-flex h-10 items-center justify-center rounded-md bg-foreground px-4 text-sm font-medium text-background transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40";
const secondaryClass =
  "inline-flex h-10 items-center justify-center rounded-md border border-border bg-surface px-4 text-sm font-medium transition-colors hover:bg-border/60 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-surface";

/** One question per screen. The score and profile always come from the server (never computed here). */
export function RiskQuestionnaire() {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<(number | null)[]>(() => Array(TOTAL).fill(null));
  const [result, setResult] = useState<{ riskScore: number; riskProfile: RiskProfile } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const headingRef = useRef<HTMLHeadingElement>(null);
  const mounted = useRef(false);
  useEffect(() => {
    // Moves focus on every screen change, but not on load (do not steal focus).
    if (mounted.current) headingRef.current?.focus();
    mounted.current = true;
  }, [step, result]);

  if (result) {
    const profile = RISK_PROFILES[result.riskProfile];
    return (
      <section className="mt-6">
        <h2 ref={headingRef} tabIndex={-1} className="text-lg font-semibold tracking-tight text-balance outline-none">
          Tu perfil es {profile.label}
        </h2>
        <p className="mt-1 text-sm text-muted">
          Puntaje: {result.riskScore} de 24
        </p>
        <p className="mt-4 text-[15px] leading-relaxed text-pretty">{profile.description}</p>
        <p className="mt-4 border-t border-border pt-4 text-sm text-muted">{RISK_DISCLAIMER}</p>
        <Link href="/" className={`${primaryClass} mt-6 w-full`}>
          Ir a la app
        </Link>
      </section>
    );
  }

  const question = RISK_QUESTIONS[step];
  const selected = answers[step];
  const isLast = step === TOTAL - 1;

  function choose(value: number) {
    setAnswers((prev) => prev.map((a, i) => (i === step ? value : a)));
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (selected === null || pending) return;
    if (!isLast) {
      setStep(step + 1);
      return;
    }
    setError(null);
    startTransition(async () => {
      // Every step requires an answer before advancing, so all 6 are set here; the action validates again.
      const r = await submitRiskProfile(answers as number[]);
      if (r.ok) setResult({ riskScore: r.riskScore, riskProfile: r.riskProfile });
      else setError(r.error);
    });
  }

  return (
    <form onSubmit={onSubmit} className="mt-6 flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <p className="text-sm text-muted">
          Pregunta {step + 1} de {TOTAL}
        </p>
        <progress
          value={step + 1}
          max={TOTAL}
          aria-label="Progreso del cuestionario"
          className="h-1 w-full appearance-none overflow-hidden rounded-full bg-border [&::-moz-progress-bar]:bg-foreground [&::-webkit-progress-bar]:bg-border [&::-webkit-progress-value]:bg-foreground [&::-webkit-progress-value]:transition-[width] [&::-webkit-progress-value]:duration-300"
        />
      </div>

      <fieldset className="min-w-0">
        <legend className="mb-3">
          <h2 ref={headingRef} tabIndex={-1} className="text-[17px] leading-snug font-semibold tracking-tight text-balance outline-none">
            {question.title}
          </h2>
        </legend>
        <div className="flex flex-col gap-2">
          {question.options.map((option, k) => (
            <label
              key={option}
              className="flex cursor-pointer items-start gap-3 rounded-md border border-border bg-background px-3 py-2.5 text-[15px] leading-snug transition-colors hover:border-muted/60 has-checked:border-accent has-checked:bg-accent-soft has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-accent"
            >
              <input
                type="radio"
                name={`q${step + 1}`}
                value={k + 1}
                checked={selected === k + 1}
                onChange={() => choose(k + 1)}
                className="mt-0.5 size-4 shrink-0 accent-accent focus-visible:outline-none"
              />
              <span className="min-w-0">{option}</span>
            </label>
          ))}
        </div>
      </fieldset>

      {error && <FormAlert>{error}</FormAlert>}

      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => setStep(step - 1)}
          disabled={step === 0 || pending}
          className={`${secondaryClass} flex-1`}
        >
          Atrás
        </button>
        <button type="submit" disabled={selected === null || pending} className={`${primaryClass} flex-1`}>
          {isLast ? (pending ? "Calculando…" : "Ver mi perfil") : "Siguiente"}
        </button>
      </div>
    </form>
  );
}
