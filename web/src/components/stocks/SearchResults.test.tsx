import { render, screen } from "@testing-library/react";
import type { ComponentProps } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/api";
import { SearchResults } from "./SearchResults";

vi.mock("./SearchDiscovery", () => ({ SearchDiscovery: () => <div data-testid="discovery" /> }));
vi.mock("next/form", () => ({ default: (props: ComponentProps<"form">) => <form {...props} /> }));
vi.mock("@/lib/supabase/server", () => ({ getServerAccessToken: vi.fn(async () => "jwt") }));
const searchStocks = vi.hoisted(() => vi.fn());
vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api")>();
  return { ...actual, api: { ...actual.api, searchStocks } };
});

async function renderWith(params: Record<string, string | string[] | undefined>) {
  render(await SearchResults({ searchParams: Promise.resolve(params) }));
}

describe("SearchResults", () => {
  beforeEach(() => {
    searchStocks.mockReset().mockResolvedValue({
      query: "apple",
      results: [
        { symbol: "AAPL", name: "APPLE INC", type: "stock" },
        { symbol: "SPY", name: "SPDR S&P 500 ETF TRUST", type: "etf" },
      ],
    });
  });

  it("lists links to each stock with name and type", async () => {
    await renderWith({ q: "apple" });
    expect(searchStocks).toHaveBeenCalledWith("apple", { token: "jwt" });
    const aapl = screen.getByRole("link", { name: /AAPL/ });
    expect(aapl.getAttribute("href")).toBe("/stocks/AAPL");
    expect(aapl.textContent).toContain("APPLE INC");
    expect(aapl.textContent).toContain("Acción");
    expect(screen.getByRole("link", { name: /SPY/ }).textContent).toContain("ETF");
    expect((screen.getByRole("searchbox") as HTMLInputElement).defaultValue).toBe("apple");
    expect(screen.getByText("Busca por nombre (Apple) o por símbolo (AAPL). Solo acciones y ETFs de EE. UU.")).toBeDefined();
    expect(screen.queryByTestId("discovery")).toBeNull();
  });

  it("without q shows the hint and discovery blocks and does not call the API", async () => {
    await renderWith({});
    expect(screen.getByText("Busca por nombre (Apple) o por símbolo (AAPL). Solo acciones y ETFs de EE. UU.")).toBeDefined();
    expect(screen.getByTestId("discovery")).toBeDefined();
    expect(screen.queryByText("Busca una empresa o ETF")).toBeNull();
    expect(searchStocks).not.toHaveBeenCalled();
    expect(screen.getByRole("searchbox").closest("form")?.getAttribute("action")).toBe("/search");
  });

  it("uses the first value when q is repeated", async () => {
    await renderWith({ q: ["a", "b"] });
    expect(searchStocks).toHaveBeenCalledWith("a", expect.anything());
  });

  it("says when there are no results", async () => {
    searchStocks.mockResolvedValue({ query: "zzz", results: [] });
    await renderWith({ q: "zzz" });
    expect(screen.getByText("Sin resultados para «zzz»")).toBeDefined();
    expect(screen.queryByRole("list")).toBeNull();
    expect(screen.queryByTestId("discovery")).toBeNull();
  });

  it("shows an alert on API errors", async () => {
    searchStocks.mockRejectedValue(new ApiError(502, "PROVIDER_ERROR", "bad"));
    await renderWith({ q: "apple" });
    expect(screen.getByRole("alert").textContent).toContain("El proveedor de datos no respondió correctamente.");
    expect(screen.queryByTestId("discovery")).toBeNull();
  });
});
