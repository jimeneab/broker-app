import type { InputHTMLAttributes, ReactNode } from "react";

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, "id" | "name"> & {
  name: string;
  label: string;
  error?: string;
};

/** Labelled input whose error is announced via aria-invalid + aria-describedby. */
export function AuthField({ name, label, error, ...input }: Props) {
  const errorId = `${name}-error`;
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={name} className="text-sm font-medium">
        {label}
      </label>
      <input
        id={name}
        name={name}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        className="h-10 w-full min-w-0 rounded-md border border-border bg-background px-3 text-[15px] transition-colors hover:border-muted/60 aria-invalid:border-down"
        {...input}
      />
      {error && (
        <p id={errorId} className="text-sm text-down">
          {error}
        </p>
      )}
    </div>
  );
}

export function FormAlert({ children }: { children?: ReactNode }) {
  if (!children) return null;
  return (
    <p role="alert" className="flex items-start gap-2 rounded-md border border-down/40 bg-down/8 px-3 py-2.5 text-sm">
      <svg aria-hidden="true" viewBox="0 0 24 24" className="mt-0.5 size-4 shrink-0 text-down" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round">
        <path d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zm0-13v5m0 3.5v.01" />
      </svg>
      <span>{children}</span>
    </p>
  );
}

export function SubmitButton({ pending, idle, busy }: { pending: boolean; idle: string; busy: string }) {
  return (
    <button
      type="submit"
      disabled={pending}
      className="h-10 w-full rounded-md bg-foreground text-sm font-medium text-background transition-opacity hover:opacity-90 disabled:cursor-progress disabled:opacity-60"
    >
      {pending ? busy : idle}
    </button>
  );
}
