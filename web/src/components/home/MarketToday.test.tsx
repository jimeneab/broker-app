import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { MarketToday } from "./MarketToday";

vi.mock("@/components/home/QuoteCard", () => ({
  QuoteCard: ({ symbol, name }: { symbol: string; name?: string }) => (
    <div data-testid="quote-card" data-symbol={symbol} data-name={name} />
  ),
  QuoteCardSkeleton: () => <div />,
}));

describe("MarketToday", () => {
  it("renders the three index cards in order", () => {
    render(<MarketToday />);
    expect(screen.getByRole("heading", { level: 2, name: "Mercado hoy" })).toBeDefined();
    const cards = screen.getAllByTestId("quote-card");
    expect(cards.map((c) => c.dataset.symbol)).toEqual(["SPY", "QQQ", "DIA"]);
    expect(cards.map((c) => c.dataset.name)).toEqual(["S&P 500", "Nasdaq 100", "Dow Jones"]);
  });

  it("accepts a custom title", () => {
    render(<MarketToday title="Índices de referencia" />);
    expect(screen.getByRole("heading", { level: 2, name: "Índices de referencia" })).toBeDefined();
    expect(screen.getByRole("region", { name: "Índices de referencia" })).toBeDefined();
    expect(screen.getAllByTestId("quote-card").map((c) => c.dataset.symbol)).toEqual(["SPY", "QQQ", "DIA"]);
  });
});
