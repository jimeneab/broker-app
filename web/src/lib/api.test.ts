import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { ApiError, api, errorMessage, request } from "./api";

const fetchMock = vi.fn();

function sentHeaders(): Record<string, string> {
  return (fetchMock.mock.calls[0]?.[1] as RequestInit).headers as Record<string, string>;
}

describe("api client", () => {
  beforeEach(() => vi.stubGlobal("fetch", fetchMock));
  afterEach(() => {
    vi.unstubAllGlobals();
    fetchMock.mockReset();
  });

  it("calls the API URL and attaches the bearer token", async () => {
    fetchMock.mockResolvedValue(Response.json({ status: "ok" }));
    await expect(api.health({ token: "jwt" })).resolves.toEqual({ status: "ok" });
    expect(fetchMock.mock.calls[0]?.[0]).toBe("http://api.test/health");
    expect(sentHeaders()).toEqual({ Accept: "application/json", Authorization: "Bearer jwt" });
  });

  it("omits Authorization without a token and sends JSON bodies", async () => {
    fetchMock.mockResolvedValue(Response.json({ ok: true }));
    await request("/x", z.object({ ok: z.boolean() }), { method: "POST", body: { a: 1 } });
    const init = fetchMock.mock.calls[0]?.[1] as RequestInit;
    expect(sentHeaders()).toEqual({ Accept: "application/json", "Content-Type": "application/json" });
    expect(init.method).toBe("POST");
    expect(init.body).toBe('{"a":1}');
  });

  it("returns undefined for 204", async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }));
    await expect(request("/x", z.undefined(), { method: "DELETE" })).resolves.toBeUndefined();
  });

  it("throws ApiError with the code and message of an error response", async () => {
    fetchMock.mockResolvedValue(
      Response.json({ error: { code: "PROVIDER_ERROR", message: "Market data provider error" } }, { status: 502 }),
    );
    await expect(api.health()).rejects.toEqual(new ApiError(502, "PROVIDER_ERROR", "Market data provider error"));
    await api.health().catch((err: ApiError) => expect(err.status).toBe(502));
  });

  it("throws UNKNOWN_ERROR for an error without the shape", async () => {
    fetchMock.mockResolvedValue(new Response("<html>Bad gateway</html>", { status: 502 }));
    await expect(api.health()).rejects.toMatchObject({ status: 502, code: "UNKNOWN_ERROR" });
  });

  it("throws NETWORK_ERROR when fetch rejects", async () => {
    fetchMock.mockRejectedValue(new TypeError("Failed to fetch"));
    await expect(api.health()).rejects.toMatchObject({ status: 0, code: "NETWORK_ERROR" });
  });

  it("throws INVALID_RESPONSE when a 2xx does not match the schema", async () => {
    fetchMock.mockResolvedValue(Response.json({ status: "down" }));
    await expect(api.health()).rejects.toMatchObject({ status: 200, code: "INVALID_RESPONSE" });
  });

  it("api.me parses the profile shape", async () => {
    const me = {
      id: "5f0c2b4e-8a1d-4c3e-9b7a-1d2e3f4a5b6c",
      email: "ana@example.com",
      displayName: "Ana",
      riskScore: null,
      riskProfile: null,
      onboardedAt: null,
      createdAt: "2026-11-18T12:00:00.000Z",
    };
    fetchMock.mockResolvedValue(Response.json(me));
    await expect(api.me({ token: "jwt" })).resolves.toEqual(me);
    expect(fetchMock.mock.calls[0]?.[0]).toBe("http://api.test/me");
    fetchMock.mockResolvedValue(Response.json({ ...me, riskProfile: "yolo" }));
    await expect(api.me({ token: "jwt" })).rejects.toMatchObject({ code: "INVALID_RESPONSE" });
  });

  it("api.saveRiskProfile PUTs the answers as JSON with the token and parses the profile", async () => {
    const me = {
      id: "5f0c2b4e-8a1d-4c3e-9b7a-1d2e3f4a5b6c",
      email: "ana@example.com",
      displayName: "Ana",
      riskScore: 15,
      riskProfile: "moderado",
      onboardedAt: "2026-11-18T14:00:00.000Z",
      createdAt: "2026-11-18T12:00:00.000Z",
    };
    fetchMock.mockResolvedValue(Response.json(me));
    await expect(api.saveRiskProfile([3, 2, 3, 2, 3, 2], { token: "jwt" })).resolves.toEqual(me);
    const init = fetchMock.mock.calls[0]?.[1] as RequestInit;
    expect(fetchMock.mock.calls[0]?.[0]).toBe("http://api.test/me/risk-profile");
    expect(init.method).toBe("PUT");
    expect(init.body).toBe('{"answers":[3,2,3,2,3,2]}');
    expect(sentHeaders()).toEqual({
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: "Bearer jwt",
    });
  });

  it.each([
    ["PROVIDER_RATE_LIMITED", "Demasiadas solicitudes al proveedor de datos. Intenta de nuevo en un minuto."],
    ["PROVIDER_ERROR", "El proveedor de datos no respondió correctamente."],
    ["NETWORK_ERROR", "No se pudo conectar con el servidor."],
    ["UNAUTHORIZED", "Tu sesión expiró. Inicia sesión de nuevo."],
    ["PROFILE_NOT_FOUND", "No encontramos tu perfil."],
    ["VALIDATION_ERROR", "Revisa tus respuestas e intenta de nuevo."],
    ["SOMETHING_ELSE", "Algo salió mal. Intenta de nuevo."],
  ])("errorMessage(%s)", (code, message) => {
    expect(errorMessage(new ApiError(500, code, "x"))).toBe(message);
  });

  it("errorMessage falls back for non-ApiError values", () => {
    expect(errorMessage(new Error("x"))).toBe("Algo salió mal. Intenta de nuevo.");
  });
});
