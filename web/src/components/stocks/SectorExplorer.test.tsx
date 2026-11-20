import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SectorExplorer } from "./SectorExplorer";

const apiFns = vi.hoisted(() => ({ searchStocks: vi.fn(), stock: vi.fn() }));
vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api")>();
  return { ...actual, api: { ...actual.api, ...apiFns } };
});

describe("SectorExplorer", () => {
  it("renders the 6 sectors with links, types and the note, without the API", () => {
    render(<SectorExplorer />);
    expect(screen.getByRole("heading", { level: 2, name: "Explorar por sector" })).toBeDefined();
    expect(screen.getAllByRole("heading", { level: 3 }).map((h) => h.textContent)).toEqual([
      "Tecnología",
      "Finanzas",
      "Salud",
      "Consumo",
      "Energía",
      "ETFs",
    ]);
    const links = screen.getAllByRole("link");
    expect(links).toHaveLength(28);
    const aapl = links.find((a) => a.getAttribute("href") === "/stocks/AAPL");
    expect(aapl?.textContent).toContain("Apple");
    const voo = links.find((a) => a.getAttribute("href") === "/stocks/VOO");
    expect(voo?.textContent).toContain("Vanguard S&P 500 ETF");
    expect(screen.getAllByText("ETF")).toHaveLength(5);
    expect(screen.getAllByText("Acción")).toHaveLength(23);
    expect(screen.getByText("Lista de ejemplo para explorar; no es recomendación de inversión.")).toBeDefined();
    for (const fn of Object.values(apiFns)) expect(fn).not.toHaveBeenCalled();
  });
});
