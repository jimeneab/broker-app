import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth/actions", () => ({ login: vi.fn(), signup: vi.fn(), logout: vi.fn() }));
vi.mock("@/lib/risk/actions", () => ({ submitRiskProfile: vi.fn() }));
vi.mock("@/components/onboarding/OnboardingExit", () => ({ OnboardingExit: () => null }));

const { default: AuthLayout } = await import("./layout");
const { default: LoginPage } = await import("./login/page");
const { default: SignupPage } = await import("./signup/page");
const { default: OnboardingPage } = await import("./onboarding/page");

describe("auth pages", () => {
  it("login page shows its title inside the auth layout (no sidebar)", () => {
    render(
      <AuthLayout>
        <LoginPage />
      </AuthLayout>,
    );
    expect(screen.getByRole("heading", { name: "Iniciar sesión" })).toBeDefined();
    expect(screen.getByText("Stock Insights")).toBeDefined();
    expect(screen.queryByRole("navigation")).toBeNull();
  });

  it("signup page shows its title", () => {
    render(<SignupPage />);
    expect(screen.getByRole("heading", { name: "Crear cuenta" })).toBeDefined();
  });

  it("onboarding page shows the title and question 1 of the questionnaire", () => {
    render(<OnboardingPage />);
    expect(screen.getByRole("heading", { level: 1, name: "Tu perfil de riesgo" })).toBeDefined();
    expect(screen.getByText("Pregunta 1 de 6")).toBeDefined();
    expect(screen.queryByText(/muy pronto/)).toBeNull();
  });
});
