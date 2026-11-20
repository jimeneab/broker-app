import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ComingSoon } from "./ComingSoon";

describe("ComingSoon", () => {
  it("announces the upcoming features without links or buttons", () => {
    render(<ComingSoon />);
    expect(screen.getByRole("heading", { level: 2, name: "Próximamente" })).toBeDefined();
    for (const text of [
      "Favoritos",
      "Guarda stocks para seguirlos de cerca.",
      "Noticias",
      "Noticias del mercado y de tus empresas.",
      "Simulador",
      "Practica con dinero ficticio y precios reales.",
    ]) {
      expect(screen.getByText(text)).toBeDefined();
    }
    // Heading + 3 badges.
    expect(screen.getAllByText("Próximamente")).toHaveLength(4);
    expect(screen.queryAllByRole("link")).toHaveLength(0);
    expect(screen.queryAllByRole("button")).toHaveLength(0);
  });
});
