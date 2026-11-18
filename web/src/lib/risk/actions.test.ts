import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError, api } from "../api";

const getServerAccessToken = vi.fn<() => Promise<string | null>>();
vi.mock("../supabase/server", () => ({ getServerAccessToken }));
const revalidatePath = vi.fn();
vi.mock("next/cache", () => ({ revalidatePath }));

const { submitRiskProfile } = await import("./actions");

const me = {
  id: "u",
  email: "ana@example.com",
  displayName: "Ana",
  riskScore: 15,
  riskProfile: "moderado" as const,
  onboardedAt: "2026-11-18T14:00:00.000Z",
  createdAt: "2026-11-18T12:00:00.000Z",
};

describe("submitRiskProfile", () => {
  const save = vi.spyOn(api, "saveRiskProfile");

  beforeEach(() => getServerAccessToken.mockResolvedValue("jwt"));
  afterEach(() => vi.clearAllMocks());

  it.each([
    ["5 elements", [1, 2, 3, 4, 1]],
    ["a 0", [0, 2, 3, 4, 1, 2]],
    ["a 5", [5, 2, 3, 4, 1, 2]],
    ["a 1.5", [1.5, 2, 3, 4, 1, 2]],
  ])("rejects %s without calling the API", async (_label, answers) => {
    await expect(submitRiskProfile(answers)).resolves.toEqual({
      ok: false,
      error: "Revisa tus respuestas e intenta de nuevo.",
    });
    expect(save).not.toHaveBeenCalled();
  });

  it("asks to log in again without a session, without calling the API", async () => {
    getServerAccessToken.mockResolvedValue(null);
    await expect(submitRiskProfile([3, 2, 3, 2, 3, 2])).resolves.toEqual({
      ok: false,
      error: "Tu sesión expiró. Inicia sesión de nuevo.",
    });
    expect(save).not.toHaveBeenCalled();
  });

  it("saves, revalidates the root layout and returns exactly what the API computed", async () => {
    save.mockResolvedValue({ ...me, riskScore: 21, riskProfile: "agresivo" });
    await expect(submitRiskProfile([1, 1, 1, 1, 1, 1])).resolves.toEqual({
      ok: true,
      riskScore: 21,
      riskProfile: "agresivo",
    });
    expect(save).toHaveBeenCalledWith([1, 1, 1, 1, 1, 1], { token: "jwt" });
    expect(revalidatePath).toHaveBeenCalledWith("/", "layout");
  });

  it.each([
    ["VALIDATION_ERROR", new ApiError(400, "VALIDATION_ERROR", "x"), "Revisa tus respuestas e intenta de nuevo."],
    ["NETWORK_ERROR", new ApiError(0, "NETWORK_ERROR", "x"), "No se pudo conectar con el servidor."],
  ])("maps %s without revalidating", async (_code, err, message) => {
    save.mockRejectedValue(err);
    await expect(submitRiskProfile([3, 2, 3, 2, 3, 2])).resolves.toEqual({ ok: false, error: message });
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("treats a response without score as a generic error", async () => {
    save.mockResolvedValue({ ...me, riskScore: null, riskProfile: null });
    await expect(submitRiskProfile([3, 2, 3, 2, 3, 2])).resolves.toEqual({
      ok: false,
      error: "Algo salió mal. Intenta de nuevo.",
    });
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});
