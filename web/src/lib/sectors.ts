import type { StockSearchResult } from "./api";

export type SectorEntry = { symbol: string; name: string; type: StockSearchResult["type"] };
export type Sector = { id: string; title: string; entries: readonly SectorEntry[] };

const stocks = (...pairs: [string, string][]): SectorEntry[] =>
  pairs.map(([symbol, name]) => ({ symbol, name, type: "stock" }));

/** Static sample list for discovery; not a recommendation. Replaced by the F07 catalog when it exists. */
export const SECTORS: readonly Sector[] = [
  {
    id: "tech",
    title: "Tecnología",
    entries: stocks(["AAPL", "Apple"], ["MSFT", "Microsoft"], ["NVDA", "NVIDIA"], ["GOOGL", "Alphabet"], ["META", "Meta Platforms"]),
  },
  {
    id: "finance",
    title: "Finanzas",
    entries: stocks(["JPM", "JPMorgan Chase"], ["V", "Visa"], ["MA", "Mastercard"], ["BAC", "Bank of America"], ["GS", "Goldman Sachs"]),
  },
  {
    id: "health",
    title: "Salud",
    entries: stocks(["JNJ", "Johnson & Johnson"], ["UNH", "UnitedHealth"], ["LLY", "Eli Lilly"], ["PFE", "Pfizer"], ["ABBV", "AbbVie"]),
  },
  {
    id: "consumer",
    title: "Consumo",
    entries: stocks(["KO", "Coca-Cola"], ["PG", "Procter & Gamble"], ["WMT", "Walmart"], ["MCD", "McDonald's"], ["NKE", "Nike"]),
  },
  {
    id: "energy",
    title: "Energía",
    entries: stocks(["XOM", "Exxon Mobil"], ["CVX", "Chevron"], ["COP", "ConocoPhillips"]),
  },
  {
    id: "etf",
    title: "ETFs",
    entries: [
      { symbol: "SPY", name: "SPDR S&P 500 ETF Trust", type: "etf" },
      { symbol: "QQQ", name: "Invesco QQQ Trust", type: "etf" },
      { symbol: "DIA", name: "SPDR Dow Jones Industrial Average ETF Trust", type: "etf" },
      { symbol: "VTI", name: "Vanguard Total Stock Market ETF", type: "etf" },
      { symbol: "VOO", name: "Vanguard S&P 500 ETF", type: "etf" },
    ],
  },
];
