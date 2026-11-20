import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SearchDiscovery } from "./SearchDiscovery";

vi.mock("@/components/home/QuoteCard", () => ({
  QuoteCard: ({ symbol }: { symbol: string }) => <div data-testid="quote-card" data-symbol={symbol} />,
  QuoteCardSkeleton: () => <div />,
}));
vi.mock("./RecentSymbols", () => ({ RecentSymbols: () => <nav aria-label="Vistos recientemente" /> }));

const before = (a: Element, b: Element) => Boolean(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING);

describe("SearchDiscovery", () => {
  it("renders recents, popular, indexes and sectors in order", () => {
    render(<SearchDiscovery />);
    const blocks = [
      screen.getByRole("navigation", { name: "Vistos recientemente" }),
      screen.getByRole("navigation", { name: "Populares" }),
      screen.getByRole("heading", { level: 2, name: "Índices de referencia" }),
      screen.getByRole("heading", { level: 2, name: "Explorar por sector" }),
    ];
    for (let i = 1; i < blocks.length; i++) expect(before(blocks[i - 1], blocks[i])).toBe(true);
    expect(screen.queryByRole("heading", { name: "Mercado hoy" })).toBeNull();
  });
});
