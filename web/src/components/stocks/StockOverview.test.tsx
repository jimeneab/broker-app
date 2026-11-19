import { render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError, type StockDetail } from "@/lib/api";
import { StockOverview } from "./StockOverview";

vi.mock("./PriceChart", () => ({ PriceChart: ({ symbol }: { symbol: string }) => <div data-testid="chart">{symbol}</div> }));
vi.mock("@/lib/supabase/server", () => ({ getServerAccessToken: vi.fn(async () => "jwt") }));
const stock = vi.hoisted(() => vi.fn());
vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api")>();
  return { ...actual, api: { ...actual.api, stock } };
});

const DETAIL: StockDetail = {
  symbol: "AAPL",
  quote: {
    symbol: "AAPL",
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
    symbol: "AAPL",
    name: "Apple Inc",
    logoUrl: "https://static.example/AAPL.png",
    industry: "Technology",
    country: "US",
    website: "https://www.apple.com/",
    exchange: "NASDAQ NMS - GLOBAL MARKET",
    currency: "USD",
    marketCapMillions: 2_950_000,
  },
  metrics: {
    peRatio: 29.4,
    beta: 1.24,
    week52High: 199.62,
    week52Low: 164.08,
    dividendYieldPercent: 0.51,
    marketCapMillions: 3_400,
  },
};

async function renderSymbol(symbol: string) {
  render(await StockOverview({ params: Promise.resolve({ symbol }) }));
}

const metric = (label: string) => screen.getByText(label).nextElementSibling?.textContent;

describe("StockOverview", () => {
  beforeEach(() => {
    stock.mockReset().mockResolvedValue(DETAIL);
  });

  it("normalizes the symbol and renders header, change and metrics", async () => {
    await renderSymbol("aapl");
    expect(stock).toHaveBeenCalledWith("AAPL", { token: "jwt" });
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Apple Inc");
    expect(screen.getByText("$189.84")).toBeDefined();
    const change = screen.getByTestId("price-change");
    expect(change.textContent).toContain("+2.31 (+1.23%)");
    expect(change.className).toContain("text-up");
    expect(within(change).getByText("Sube")).toBeDefined();
    expect(metric("Capitalización")).toBe("2.95 T");
    expect(metric("Rend. dividendo")).toBe("0.51%");
    expect(screen.getByRole("link", { name: "apple.com" }).getAttribute("target")).toBe("_blank");
    expect(document.querySelector('[data-slot="favorite"]')).not.toBeNull();
    expect(screen.getByTestId("chart").textContent).toBe("AAPL");
  });

  it("colors a negative change as down", async () => {
    stock.mockResolvedValue({ ...DETAIL, quote: { ...DETAIL.quote, change: -1.05, changePercent: -0.55 } });
    await renderSymbol("AAPL");
    const change = screen.getByTestId("price-change");
    expect(change.className).toContain("text-down");
    expect(change.textContent).toContain("-1.05 (-0.55%)");
    expect(within(change).getByText("Baja")).toBeDefined();
  });

  it("without profile shows the symbol as title and falls back to metrics market cap", async () => {
    stock.mockResolvedValue({ ...DETAIL, profile: null });
    await renderSymbol("AAPL");
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("AAPL");
    expect(metric("Sector")).toBe("—");
    expect(metric("Capitalización")).toBe("3.4 B");
  });

  it("without profile or metrics shows — for market cap", async () => {
    stock.mockResolvedValue({ ...DETAIL, profile: null, metrics: null });
    await renderSymbol("AAPL");
    expect(metric("Capitalización")).toBe("—");
  });

  it("renders the tabs with Técnico and Noticias disabled", async () => {
    await renderSymbol("AAPL");
    expect(screen.getByRole("tab", { name: "Resumen" }).getAttribute("aria-selected")).toBe("true");
    for (const name of [/Técnico/, /Noticias/]) {
      const tab = screen.getByRole("tab", { name });
      expect(tab.hasAttribute("disabled")).toBe(true);
      expect(tab.textContent).toContain("Próximamente");
    }
  });

  it("404 SYMBOL_NOT_FOUND shows the empty state with a search link", async () => {
    stock.mockRejectedValue(new ApiError(404, "SYMBOL_NOT_FOUND", "Symbol not found"));
    await renderSymbol("zzzzz");
    expect(screen.getByText("No encontramos el símbolo ZZZZZ")).toBeDefined();
    expect(screen.getByRole("link", { name: "Buscar «ZZZZZ»" }).getAttribute("href")).toBe("/search?q=ZZZZZ");
  });

  it("an invalid symbol shows the same state without calling the API", async () => {
    await renderSymbol("AAPL1");
    expect(screen.getByText("No encontramos el símbolo AAPL1")).toBeDefined();
    expect(stock).not.toHaveBeenCalled();
  });

  it("other errors show an alert", async () => {
    stock.mockRejectedValue(new ApiError(502, "PROVIDER_ERROR", "bad"));
    await renderSymbol("AAPL");
    expect(screen.getByRole("alert").textContent).toContain("El proveedor de datos no respondió correctamente.");
  });
});
