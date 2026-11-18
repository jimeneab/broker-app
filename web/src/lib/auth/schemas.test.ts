import { describe, expect, it } from "vitest";
import type { z } from "zod";
import { loginSchema, signupSchema } from "./schemas";

const firstMessage = (result: z.ZodSafeParseResult<unknown>) => result.error?.issues[0]?.message;

describe("loginSchema", () => {
  it("rejects an invalid email", () => {
    expect(firstMessage(loginSchema.safeParse({ email: "ana", password: "x" }))).toBe("Ingresa un email válido.");
  });

  it("rejects an empty password", () => {
    expect(firstMessage(loginSchema.safeParse({ email: "ana@example.com", password: "" }))).toBe("Ingresa tu contraseña.");
  });

  it("trims the email", () => {
    expect(loginSchema.parse({ email: "  ana@example.com ", password: "x" }).email).toBe("ana@example.com");
  });
});

describe("signupSchema", () => {
  const valid = { displayName: "Ana", email: "ana@example.com", password: "12345678" };

  it.each([
    ["password of 7", { password: "1234567" }, "La contraseña debe tener al menos 8 caracteres."],
    ["password of 73", { password: "x".repeat(73) }, "Máximo 72 caracteres."],
    ["empty name", { displayName: "" }, "Ingresa tu nombre."],
    ["whitespace name", { displayName: "   " }, "Ingresa tu nombre."],
    ["name of 51", { displayName: "x".repeat(51) }, "Máximo 50 caracteres."],
    ["invalid email", { email: "nope" }, "Ingresa un email válido."],
  ])("rejects %s", (_name, override, message) => {
    expect(firstMessage(signupSchema.safeParse({ ...valid, ...override }))).toBe(message);
  });

  it("accepts valid data, trimming name and email", () => {
    const parsed = signupSchema.safeParse({ ...valid, displayName: "  Ana ", email: " ana@example.com " });
    expect(parsed.success).toBe(true);
    expect(parsed.data).toEqual({ displayName: "Ana", email: "ana@example.com", password: "12345678" });
  });
});
