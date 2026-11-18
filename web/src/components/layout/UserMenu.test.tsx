import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const getClaims = vi.fn();
vi.mock("@/lib/supabase/server", () => ({ createSupabaseServerClient: async () => ({ auth: { getClaims } }) }));
vi.mock("@/lib/auth/actions", () => ({ logout: vi.fn() }));

const { UserMenu } = await import("./UserMenu");

describe("UserMenu", () => {
  beforeEach(() => getClaims.mockReset());

  it("shows the email and a logout button inside a form", async () => {
    getClaims.mockResolvedValue({ data: { claims: { sub: "u", email: "ana@example.com" } } });
    render(await UserMenu());
    expect(screen.getByLabelText("Menú de usuario")).toBeDefined();
    expect(screen.getByText("ana@example.com").getAttribute("title")).toBe("ana@example.com");
    const button = screen.getByRole("button", { name: "Cerrar sesión" });
    expect(button.closest("form")).not.toBeNull();
  });

  it("links to the questionnaire to redo it", async () => {
    getClaims.mockResolvedValue({ data: { claims: { sub: "u", email: "ana@example.com" } } });
    render(await UserMenu());
    expect(screen.getByRole("link", { name: "Rehacer cuestionario" }).getAttribute("href")).toBe("/onboarding");
  });

  it("renders only the avatar without claims", async () => {
    getClaims.mockResolvedValue({ data: null });
    const { container } = render(await UserMenu());
    expect(screen.queryByRole("button", { name: "Cerrar sesión" })).toBeNull();
    expect(container.querySelector("svg")).not.toBeNull();
  });
});
