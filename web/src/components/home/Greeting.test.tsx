import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Me } from "@/lib/api";
import { RISK_PROFILES } from "@/lib/risk/questions";
import { Greeting } from "./Greeting";

const getMe = vi.hoisted(() => vi.fn());
vi.mock("@/lib/me", () => ({ getMe }));

const ME: Me = {
  id: "u1",
  email: "ana@example.com",
  displayName: "Ana",
  riskScore: 15,
  riskProfile: "moderado",
  onboardedAt: "2026-11-01T00:00:00Z",
  createdAt: "2026-11-01T00:00:00Z",
};

const heading = () => screen.getByRole("heading", { level: 1 }).textContent;

describe("Greeting", () => {
  beforeEach(() => getMe.mockReset());

  it("greets by name with the risk profile", async () => {
    getMe.mockResolvedValue(ME);
    render(await Greeting());
    expect(heading()).toBe("Hola, Ana");
    expect(screen.getByText("Moderado")).toBeDefined();
    expect(screen.getByText(RISK_PROFILES.moderado.description)).toBeDefined();
    expect(screen.getByText("Puntaje 15 de 24")).toBeDefined();
    expect(screen.getByRole("link", { name: "Rehacer cuestionario" }).getAttribute("href")).toBe("/onboarding");
  });

  it("says only Hola when /me fails, without an error", async () => {
    getMe.mockResolvedValue(null);
    render(await Greeting());
    expect(heading()).toBe("Hola");
    for (const label of ["Moderado", "Conservador", "Agresivo", "Rehacer cuestionario"]) {
      expect(screen.queryByText(label)).toBeNull();
    }
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("omits badge and score without a risk profile", async () => {
    getMe.mockResolvedValue({ ...ME, riskProfile: null, riskScore: null });
    render(await Greeting());
    expect(heading()).toBe("Hola, Ana");
    expect(screen.queryByText("Moderado")).toBeNull();
    expect(screen.queryByText(/Puntaje/)).toBeNull();
  });

  it("says Hola without a comma when the name is empty, keeping the profile", async () => {
    getMe.mockResolvedValue({ ...ME, displayName: "" });
    render(await Greeting());
    expect(heading()).toBe("Hola");
    expect(screen.getByText("Moderado")).toBeDefined();
    expect(screen.getByText(RISK_PROFILES.moderado.description)).toBeDefined();
    expect(screen.getByText("Puntaje 15 de 24")).toBeDefined();
    expect(screen.getByRole("link", { name: "Rehacer cuestionario" }).getAttribute("href")).toBe("/onboarding");
  });
});
