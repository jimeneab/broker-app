import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AuthFormState } from "@/lib/auth/actions";

const login = vi.fn<(prev: AuthFormState, data: FormData) => Promise<AuthFormState>>();
vi.mock("@/lib/auth/actions", () => ({ login }));

const { LoginForm } = await import("./LoginForm");

const submit = () => fireEvent.submit(screen.getByRole("button", { name: "Entrar" }).closest("form")!);

describe("LoginForm", () => {
  beforeEach(() => login.mockReset());

  it("renders labelled fields with types and autocomplete, and a link to /signup", () => {
    render(<LoginForm />);
    const email = screen.getByLabelText("Email");
    expect(email.getAttribute("type")).toBe("email");
    expect(email.getAttribute("autocomplete")).toBe("email");
    const password = screen.getByLabelText("Contraseña");
    expect(password.getAttribute("type")).toBe("password");
    expect(password.getAttribute("autocomplete")).toBe("current-password");
    expect(screen.getByRole("link", { name: "Crear cuenta" }).getAttribute("href")).toBe("/signup");
  });

  it("shows field errors linked to their inputs", async () => {
    login.mockResolvedValue({ fieldErrors: { email: "Ingresa un email válido." }, values: { email: "ana" } });
    render(<LoginForm />);
    submit();
    const error = await screen.findByText("Ingresa un email válido.");
    const email = screen.getByLabelText("Email");
    expect(error.id).toBe("email-error");
    expect(email.getAttribute("aria-invalid")).toBe("true");
    expect(email.getAttribute("aria-describedby")).toBe("email-error");
    expect((email as HTMLInputElement).value).toBe("ana");
    expect(screen.getByLabelText("Contraseña").getAttribute("aria-invalid")).toBeNull();
  });

  it("announces the form error in an alert", async () => {
    login.mockResolvedValue({ formError: "Email o contraseña incorrectos." });
    render(<LoginForm />);
    submit();
    expect((await screen.findByRole("alert")).textContent).toBe("Email o contraseña incorrectos.");
  });
});
