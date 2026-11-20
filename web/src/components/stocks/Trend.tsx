/** Drawn triangle, not a glyph, so it matches the icon stroke system. Color is never the only signal. */
export function Trend({ up }: { up: boolean }) {
  return (
    <>
      <svg aria-hidden="true" viewBox="0 0 10 10" className={`size-2.5 fill-current ${up ? "" : "rotate-180"}`}>
        <path d="M5 1.5 9 8.5H1z" />
      </svg>
      <span className="sr-only">{up ? "Sube" : "Baja"}</span>
    </>
  );
}

export function changeTone(change: number | null): "text-up" | "text-down" | "text-muted" {
  if (change === null || change === 0) return "text-muted";
  return change > 0 ? "text-up" : "text-down";
}
