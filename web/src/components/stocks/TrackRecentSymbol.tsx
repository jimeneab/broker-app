"use client";

import { useEffect } from "react";
import { addRecent, parseRecent, RECENT_KEY } from "@/lib/recent";

/** Remembers a stock page that loaded fine. Renders nothing. */
export function TrackRecentSymbol({ symbol }: { symbol: string }) {
  useEffect(() => {
    try {
      localStorage.setItem(RECENT_KEY, JSON.stringify(addRecent(parseRecent(localStorage.getItem(RECENT_KEY)), symbol)));
    } catch {
      // Blocked or full storage: recents are optional.
    }
  }, [symbol]);
  return null;
}
