export interface SymbolSearchResult {
  symbol: string;
  name: string;
  type: string;
}

export interface Quote {
  symbol: string;
  price: number;
  change: number | null;
  changePercent: number | null;
  high: number;
  low: number;
  open: number;
  previousClose: number;
  /** Unix seconds */
  timestamp: number;
}

export interface CompanyProfile {
  symbol: string;
  name: string;
  logoUrl: string | null;
  /** Finnhub "finnhubIndustry"; the UI calls it "sector". */
  industry: string | null;
  country: string | null;
  website: string | null;
  exchange: string | null;
  currency: string | null;
  marketCapMillions: number | null;
}

export interface CompanyMetrics {
  peRatio: number | null;
  beta: number | null;
  week52High: number | null;
  week52Low: number | null;
  dividendYieldPercent: number | null;
  marketCapMillions: number | null;
}

export interface NewsItem {
  id: number;
  headline: string;
  source: string;
  summary: string;
  url: string;
  imageUrl: string | null;
  /** ISO 8601 */
  publishedAt: string;
  related: string | null;
}

export interface Candle {
  /** YYYY-MM-DD */
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number | null;
}

export type HistoryInterval = "1day" | "1week";

export interface MarketDataProvider {
  search(query: string): Promise<SymbolSearchResult[]>;
  quote(symbol: string): Promise<Quote | null>;
  profile(symbol: string): Promise<CompanyProfile | null>;
  metrics(symbol: string): Promise<CompanyMetrics | null>;
  /** from/to: "YYYY-MM-DD" */
  companyNews(symbol: string, from: string, to: string): Promise<NewsItem[]>;
  marketNews(category: "general"): Promise<NewsItem[]>;
  /** Candles in ascending date order. */
  history(symbol: string, interval: HistoryInterval, outputSize: number): Promise<Candle[] | null>;
}
