import { render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError, type StockDetail } from "@/lib/api";
import { QuoteCard, QuoteCardSkeleton } from "./QuoteCard";

vi.mock("@/lib/supabase/server", () => ({ getServerAccessToken: vi.fn(async () => "tok") }));
const stock = vi.hoisted(() => vi.fn());
vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api")>();
  return { ...actual, api: { ...actual.api, stock } };
});

const DETAIL: StockDetail = {
  symbol: "SPY",
  quote: {
    symbol: "SPY",
    price: 189.84,
    change: 2.31,
    changePercent: 1.23,
    high: 190.1,
    low: 186.9,
    open: 187.2,
    previousClose: 187.53,
    timestamp: 1795545600,
  },
  profile: {
    symbol: "SPY",
    name: "SPDR S&P 500 ETF Trust",
    logoUrl: "https://static.example/SPY.png",
    industry: null,
    country: "US",
    website: null,
    exchange: "NYSE ARCA",
    currency: "USD",
    marketCapMillions: null,
  },
  metrics: null,
};

const withQuote = (change: number | null, changePercent: number | null): StockDetail => ({
  ...DETAIL,
  quote: { ...DETAIL.quote, change, changePercent },
});

describe("QuoteCard", () => {
  beforeEach(() => {
    stock.mockReset().mockResolvedValue(DETAIL);
  });

  it("renders a link with name, symbol, price and an up change", async () => {
    render(await QuoteCard({ symbol: "SPY", name: "S&P 500" }));
    expect(stock).toHaveBeenCalledWith("SPY", { token: "tok" });
    const link = screen.getByRole("link");
    expect(link.getAttribute("href")).toBe("/stocks/SPY");
    for (const text of ["S&P 500", "SPY", "$189.84"]) expect(within(link).getByText(text)).toBeDefined();
    const change = screen.getByTestId("quote-change");
    expect(change.textContent).toContain("+2.31 (+1.23%)");
    expect(change.className).toContain("text-up");
    expect(within(change).getByText("Sube")).toBeDefined();
    expect(screen.queryByRole("img")).toBeNull();
  });

  it("colors a negative change as down", async () => {
    stock.mockResolvedValue(withQuote(-1.05, -0.55));
    render(await QuoteCard({ symbol: "SPY", name: "S&P 500" }));
    const change = screen.getByTestId("quote-change");
    expect(change.className).toContain("text-down");
    expect(within(change).getByText("Baja")).toBeDefined();
  });

  it.each([0, null])("shows a flat change (%s) as muted without a triangle", async (value) => {
    stock.mockResolvedValue(withQuote(value, value));
    render(await QuoteCard({ symbol: "SPY", name: "S&P 500" }));
    const change = screen.getByTestId("quote-change");
    expect(change.className).toContain("text-muted");
    expect(within(change).queryByText("Sube")).toBeNull();
    expect(within(change).queryByText("Baja")).toBeNull();
  });

  it("shows the company logo and name with showCompany", async () => {
    const { container } = render(await QuoteCard({ symbol: "SPY", showCompany: true }));
    const img = container.querySelector("img");
    expect(img?.getAttribute("src")).toBe("https://static.example/SPY.png");
    expect(img?.getAttribute("width")).toBe("32");
    expect(img?.getAttribute("height")).toBe("32");
    expect(screen.getByText("SPDR S&P 500 ETF Trust")).toBeDefined();
  });

  it("falls back to the symbol as title without a profile", async () => {
    stock.mockResolvedValue({ ...DETAIL, profile: null });
    const { container } = render(await QuoteCard({ symbol: "SPY", showCompany: true }));
    expect(container.querySelector("img")).toBeNull();
    expect(screen.getAllByText("SPY")).toHaveLength(2);
  });

  it.each([
    new ApiError(503, "PROVIDER_RATE_LIMITED", "limit"),
    new ApiError(404, "SYMBOL_NOT_FOUND", "nope"),
    new Error("boom"),
  ])("shows No disponible when the call fails (%s)", async (err) => {
    stock.mockRejectedValue(err);
    render(await QuoteCard({ symbol: "DIA", name: "Dow Jones" }));
    expect(screen.getByText("No disponible").className).toContain("text-muted");
    expect(screen.getByRole("link").getAttribute("href")).toBe("/stocks/DIA");
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("announces the skeleton to screen readers", () => {
    render(<QuoteCardSkeleton />);
    expect(screen.getByText("Cargando…").className).toContain("sr-only");
  });
});
