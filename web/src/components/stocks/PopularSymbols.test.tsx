import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PopularSymbols } from "./PopularSymbols";

describe("PopularSymbols", () => {
  it("links each popular symbol to its page, in order", () => {
    render(<PopularSymbols />);
    const links = within(screen.getByRole("navigation", { name: "Populares" })).getAllByRole("link");
    const symbols = ["AAPL", "MSFT", "NVDA", "TSLA", "AMZN", "GOOGL", "SPY"];
    expect(links.map((l) => l.textContent)).toEqual(symbols);
    expect(links.map((l) => l.getAttribute("href"))).toEqual(symbols.map((s) => `/stocks/${s}`));
  });
});
