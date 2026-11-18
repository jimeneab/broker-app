import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { api } from "@/lib/api";

vi.mock("@/lib/supabase/server", () => ({ getServerAccessToken: async () => "jwt" }));
vi.mock("@/lib/auth/actions", () => ({ logout: vi.fn() }));

const { OnboardingExit } = await import("./OnboardingExit");

const me = {
  id: "u",
  email: "ana@example.com",
  displayName: "Ana",
  riskScore: null,
  riskProfile: null,
  onboardedAt: null,
  createdAt: "2026-11-18T12:00:00.000Z",
};

describe("OnboardingExit", () => {
  const meSpy = vi.spyOn(api, "me");
  afterEach(() => vi.clearAllMocks());

  it("offers 'Volver a la app' when already onboarded", async () => {
    meSpy.mockResolvedValue({ ...me, riskScore: 15, riskProfile: "moderado", onboardedAt: "2026-11-18T14:00:00.000Z" });
    render(await OnboardingExit());
    expect(screen.getByRole("link", { name: "Volver a la app" }).getAttribute("href")).toBe("/");
    expect(meSpy).toHaveBeenCalledWith({ token: "jwt" });
  });

  it("offers logout inside a form when not onboarded", async () => {
    meSpy.mockResolvedValue(me);
    render(await OnboardingExit());
    expect(screen.getByRole("button", { name: "Cerrar sesión" }).closest("form")).not.toBeNull();
    expect(screen.queryByRole("link")).toBeNull();
  });

  it("falls back to logout when /me fails", async () => {
    meSpy.mockRejectedValue(new Error("down"));
    render(await OnboardingExit());
    expect(screen.getByRole("button", { name: "Cerrar sesión" })).toBeDefined();
  });
});
