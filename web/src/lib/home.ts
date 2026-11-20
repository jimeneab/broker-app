import type { RiskProfile } from "./risk/questions";

/** ETFs that track each index: the app shows them as an approximation of the index itself. */
export const MARKET_INDEXES = [
  { symbol: "SPY", name: "S&P 500" },
  { symbol: "QQQ", name: "Nasdaq 100" },
  { symbol: "DIA", name: "Dow Jones" },
] as const;

// F07 reemplaza esta lista estática por recomendaciones personalizadas
export const IDEAS_BY_PROFILE: Record<RiskProfile, readonly string[]> = {
  conservador: ["KO", "JNJ", "PG", "VTI"],
  moderado: ["AAPL", "MSFT", "V", "QQQ"],
  agresivo: ["NVDA", "TSLA", "AMD", "META"],
};

export function ideasFor(profile: RiskProfile | null): readonly string[] {
  return IDEAS_BY_PROFILE[profile ?? "moderado"];
}
