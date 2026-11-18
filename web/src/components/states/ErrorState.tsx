import type { ReactNode } from "react";

export function ErrorState({ message, action }: { message: string; action?: ReactNode }) {
  return (
    <div role="alert" className="flex flex-col items-start gap-3 rounded-lg border border-border bg-surface px-5 py-6">
      <div className="flex items-start gap-3">
        <svg aria-hidden="true" viewBox="0 0 24 24" className="mt-0.5 size-5 shrink-0 text-down" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round">
          <path d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zm0-13v5m0 3.5v.01" />
        </svg>
        <p className="text-sm">{message}</p>
      </div>
      {action && <div className="pl-8">{action}</div>}
    </div>
  );
}
