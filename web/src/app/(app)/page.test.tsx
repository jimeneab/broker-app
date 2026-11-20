import { render, screen } from "@testing-library/react";
import type { ComponentProps } from "react";
import { describe, expect, it, vi } from "vitest";
import Home, { metadata } from "./page";

vi.mock("next/form", () => ({ default: (props: ComponentProps<"form">) => <form {...props} /> }));
vi.mock("@/components/home/Greeting", () => ({ Greeting: () => <h1>Hola</h1>, GreetingSkeleton: () => <div /> }));
vi.mock("@/components/home/ProfileIdeas", () => ({ ProfileIdeas: () => <div />, IdeasSkeleton: () => <div /> }));
vi.mock("@/components/home/QuoteCard", () => ({
  QuoteCard: ({ symbol }: { symbol: string }) => <div data-testid="quote-card" data-symbol={symbol} />,
  QuoteCardSkeleton: () => <div />,
}));

describe("Home page", () => {
  it("composes search, Populares, market and coming soon", () => {
    render(<Home />);
    const search = screen.getByRole("search");
    expect(search.getAttribute("action")).toBe("/search");
    expect((search.querySelector('input[name="q"]') as HTMLInputElement).value).toBe("");
    expect(screen.getByRole("navigation", { name: "Populares" })).toBeDefined();
    expect(screen.getByRole("heading", { level: 2, name: "Mercado hoy" })).toBeDefined();
    expect(screen.getByRole("heading", { level: 2, name: "Próximamente" })).toBeDefined();
  });

  it("sets the page title", () => {
    expect(metadata.title).toBe("Home · Stock Insights");
  });
});
