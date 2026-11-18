import type { ReactNode } from "react";

/** Centered card without sidebar or header, for /login, /signup and /onboarding. */
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col items-center px-4 py-12 sm:justify-center sm:py-16">
      <div className="w-full max-w-sm">
        <p className="mb-8 flex items-center justify-center gap-2 text-[15px] font-semibold tracking-tight">
          <svg aria-hidden="true" viewBox="0 0 24 24" className="size-5 text-accent" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 19V11m5.5 8V5m5.5 14v-6m5 6V8" />
          </svg>
          Stock Insights
        </p>
        <main className="rounded-xl border border-border bg-surface px-5 py-7 shadow-[0_1px_2px_oklch(0_0_0/0.04),0_8px_24px_oklch(0_0_0/0.05)] sm:px-8">
          {children}
        </main>
      </div>
    </div>
  );
}
