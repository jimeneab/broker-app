import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AuthFormState } from "@/lib/auth/actions";

const signup = vi.fn<(prev: AuthFormState, data: FormData) => Promise<AuthFormState>>();
vi.mock("@/lib/auth/actions", () => ({ signup }));

const { SignupForm } = await import("./SignupForm");

const submit = () => fireEvent.submit(screen.getByRole("button", { name: "Crear cuenta" }).closest("form")!);

describe("SignupForm", () => {
  beforeEach(() => signup.mockReset());

  it("renders labelled fields with types and autocomplete, and a link to /login", () => {
    render(<SignupForm />);
    expect(screen.getByLabelText("Nombre").getAttribute("autocomplete")).toBe("name");
    expect(screen.getByLabelText("Email").getAttribute("type")).toBe("email");
    const password = screen.getByLabelText("Contraseña");
    expect(password.getAttribute("type")).toBe("password");
    expect(password.getAttribute("autocomplete")).toBe("new-password");
    expect(screen.getByRole("link", { name: "Iniciar sesión" }).getAttribute("href")).toBe("/login");
  });

  it("shows field errors linked to their inputs and keeps name and email", async () => {
    signup.mockResolvedValue({
      fieldErrors: { displayName: "Ingresa tu nombre.", password: "La contraseña debe tener al menos 8 caracteres." },
      values: { displayName: "", email: "ana@example.com" },
    });
    render(<SignupForm />);
    submit();
    await screen.findByText("Ingresa tu nombre.");
    const name = screen.getByLabelText("Nombre");
    expect(name.getAttribute("aria-invalid")).toBe("true");
    expect(name.getAttribute("aria-describedby")).toBe("displayName-error");
    expect(screen.getByLabelText("Contraseña").getAttribute("aria-describedby")).toBe("password-error");
    expect((screen.getByLabelText("Email") as HTMLInputElement).value).toBe("ana@example.com");
  });

  it("announces the form error in an alert", async () => {
    signup.mockResolvedValue({ formError: "Ya existe una cuenta con ese email." });
    render(<SignupForm />);
    submit();
    expect((await screen.findByRole("alert")).textContent).toBe("Ya existe una cuenta con ese email.");
  });
});
