"use client";

import { useEffect } from "react";
import { ErrorState } from "@/components/states/ErrorState";
import { errorMessage } from "@/lib/api";

export default function AppError({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <ErrorState
      message={errorMessage(error)}
      action={
        <button
          type="button"
          onClick={() => retry()}
          className="rounded-md border border-border bg-surface px-3 py-1.5 text-sm font-medium hover:bg-border/60"
        >
          Reintentar
        </button>
      }
    />
  );
}
