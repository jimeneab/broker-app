import { beforeEach, describe, expect, it, vi } from "vitest";

const auth = {
  signInWithPassword: vi.fn(),
  signUp: vi.fn(),
  signOut: vi.fn(),
};
const createServerClient = vi.fn(() => ({ auth }));
vi.mock("@supabase/ssr", () => ({ createServerClient }));
vi.mock("next/headers", () => ({ cookies: async () => ({ getAll: () => [], set: vi.fn() }) }));
const redirect = vi.fn<(path: string) => never>(() => {
  throw new Error("NEXT_REDIRECT");
});
vi.mock("next/navigation", () => ({ redirect }));

const { login, logout, signup } = await import("./actions");

const form = (fields: Record<string, string>) => {
  const data = new FormData();
  Object.entries(fields).forEach(([k, v]) => data.set(k, v));
  return data;
};

const authError = (code: string) => ({ error: { code, message: code } });

describe("login", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns field errors without calling Supabase, keeping the email but never the password", async () => {
    const state = await login({}, form({ email: "nope", password: "" }));
    expect(state.fieldErrors).toEqual({ email: "Ingresa un email válido.", password: "Ingresa tu contraseña." });
    expect(state.values).toEqual({ email: "nope" });
    expect(auth.signInWithPassword).not.toHaveBeenCalled();
  });

  it("signs in and redirects to /", async () => {
    auth.signInWithPassword.mockResolvedValue({ error: null });
    await expect(login({}, form({ email: " ana@example.com", password: "secret123" }))).rejects.toThrow("NEXT_REDIRECT");
    expect(auth.signInWithPassword).toHaveBeenCalledWith({ email: "ana@example.com", password: "secret123" });
    expect(redirect).toHaveBeenCalledWith("/");
  });

  it("maps invalid_credentials without saying which field failed", async () => {
    auth.signInWithPassword.mockResolvedValue(authError("invalid_credentials"));
    const state = await login({}, form({ email: "ana@example.com", password: "bad" }));
    expect(state).toEqual({ formError: "Email o contraseña incorrectos.", values: { email: "ana@example.com" } });
  });

  it("maps unknown errors to a generic message", async () => {
    auth.signInWithPassword.mockResolvedValue(authError("over_request_rate_limit"));
    const state = await login({}, form({ email: "ana@example.com", password: "x" }));
    expect(state.formError).toBe("No se pudo iniciar sesión. Intenta de nuevo.");
  });
});

describe("signup", () => {
  beforeEach(() => vi.clearAllMocks());
  const valid = { displayName: "Ana", email: "ana@example.com", password: "12345678" };

  it("returns field errors without calling Supabase, keeping name and email", async () => {
    const state = await signup({}, form({ displayName: " ", email: "ana@example.com", password: "short" }));
    expect(state.fieldErrors).toEqual({
      displayName: "Ingresa tu nombre.",
      password: "La contraseña debe tener al menos 8 caracteres.",
    });
    expect(state.values).toEqual({ displayName: " ", email: "ana@example.com" });
    expect(auth.signUp).not.toHaveBeenCalled();
  });

  it("signs up with display_name metadata and redirects to /onboarding", async () => {
    auth.signUp.mockResolvedValue({ data: { session: { access_token: "t" } }, error: null });
    await expect(signup({}, form(valid))).rejects.toThrow("NEXT_REDIRECT");
    expect(auth.signUp).toHaveBeenCalledWith({
      email: "ana@example.com",
      password: "12345678",
      options: { data: { display_name: "Ana" } },
    });
    expect(redirect).toHaveBeenCalledWith("/onboarding");
  });

  it.each([
    ["user_already_exists", "Ya existe una cuenta con ese email."],
    ["email_exists", "Ya existe una cuenta con ese email."],
    ["weak_password", "La contraseña es demasiado débil."],
    ["unexpected_failure", "No se pudo crear la cuenta. Intenta de nuevo."],
  ])("maps %s", async (code, message) => {
    auth.signUp.mockResolvedValue({ data: { session: null }, ...authError(code) });
    const state = await signup({}, form(valid));
    expect(state).toEqual({ formError: message, values: { displayName: "Ana", email: "ana@example.com" } });
  });

  it("asks to confirm the email when Supabase returns no session", async () => {
    auth.signUp.mockResolvedValue({ data: { session: null }, error: null });
    const state = await signup({}, form(valid));
    expect(state.formError).toBe("Tu cuenta requiere confirmar el email. Revisa tu bandeja.");
    expect(redirect).not.toHaveBeenCalled();
  });
});

describe("logout", () => {
  it("signs out this device only and redirects to /login", async () => {
    auth.signOut.mockResolvedValue({ error: null });
    await expect(logout()).rejects.toThrow("NEXT_REDIRECT");
    expect(auth.signOut).toHaveBeenCalledWith({ scope: "local" });
    expect(redirect).toHaveBeenCalledWith("/login");
  });
});
