import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { EmptyState } from "./EmptyState";
import { ErrorState } from "./ErrorState";
import { LoadingState } from "./LoadingState";

describe("state components", () => {
  it("EmptyState shows the title, description and action", () => {
    render(<EmptyState title="Sin favoritos" description="Agrega uno" action={<button>Buscar</button>} />);
    expect(screen.getByText("Sin favoritos")).toBeDefined();
    expect(screen.getByText("Agrega uno")).toBeDefined();
    expect(screen.getByRole("button", { name: "Buscar" })).toBeDefined();
  });

  it("ErrorState is an alert with the message", () => {
    render(<ErrorState message="El proveedor de datos no respondió correctamente." />);
    expect(screen.getByRole("alert").textContent).toContain("El proveedor de datos no respondió correctamente.");
  });

  it("LoadingState is busy and labelled", () => {
    const { container } = render(<LoadingState />);
    expect(container.querySelector('[aria-busy="true"]')).not.toBeNull();
    expect(screen.getByText("Cargando…")).toBeDefined();
  });
});
