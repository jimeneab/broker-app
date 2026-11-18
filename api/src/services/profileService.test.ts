import { beforeEach, describe, expect, it, vi } from "vitest";

// Fake of the supabase-js query builder used by findProfileById.
const result: { data: unknown; error: { message: string } | null } = { data: null, error: null };
const eq = vi.fn(() => ({ maybeSingle: async () => result }));
const rpcResult: { data: unknown; error: { code?: string; message: string } | null } = { data: null, error: null };
const rpc = vi.fn(async () => rpcResult);
const fakeClient = { from: vi.fn(() => ({ select: () => ({ eq }) })), rpc };
const userClient = vi.fn(() => fakeClient);
const adminClient = vi.fn();
vi.mock("../lib/supabase.js", () => ({ userClient, adminClient }));

const { getMyProfile, submitMyRiskProfile } = await import("./profileService.js");

const user = { id: "5f0c2b4e-8a1d-4c3e-9b7a-1d2e3f4a5b6c", email: "ana@example.com" };
const row = {
  id: user.id,
  display_name: "Ana",
  risk_score: null,
  risk_profile: null,
  onboarded_at: null,
  created_at: "2026-11-18T12:00:00+00:00",
};

describe("getMyProfile", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    result.data = null;
    result.error = null;
  });

  it("reads with the user's token (never the service role) and returns camelCase with the email", async () => {
    result.data = row;
    await expect(getMyProfile(user, "jwt")).resolves.toEqual({
      id: user.id,
      email: "ana@example.com",
      displayName: "Ana",
      riskScore: null,
      riskProfile: null,
      onboardedAt: null,
      createdAt: "2026-11-18T12:00:00+00:00",
    });
    expect(userClient).toHaveBeenCalledWith("jwt");
    expect(adminClient).not.toHaveBeenCalled();
    expect(fakeClient.from).toHaveBeenCalledWith("profiles");
    expect(eq).toHaveBeenCalledWith("id", user.id);
  });

  it("maps an onboarded profile", async () => {
    result.data = { ...row, risk_score: 15, risk_profile: "moderado", onboarded_at: "2026-11-18T13:00:00+00:00" };
    await expect(getMyProfile(user, "jwt")).resolves.toMatchObject({
      riskScore: 15,
      riskProfile: "moderado",
      onboardedAt: "2026-11-18T13:00:00+00:00",
    });
  });

  it("throws 404 PROFILE_NOT_FOUND when there is no row", async () => {
    await expect(getMyProfile(user, "jwt")).rejects.toMatchObject({ status: 404, code: "PROFILE_NOT_FOUND" });
  });

  it("throws when Supabase returns an error", async () => {
    result.error = { message: "boom" };
    await expect(getMyProfile(user, "jwt")).rejects.toThrow("boom");
  });

  it("throws when risk_profile is outside the enum", async () => {
    result.data = { ...row, risk_profile: "yolo" };
    await expect(getMyProfile(user, "jwt")).rejects.toThrow();
  });
});

describe("submitMyRiskProfile", () => {
  const answers = [3, 2, 3, 2, 3, 2];
  const onboarded = { ...row, risk_score: 15, risk_profile: "moderado", onboarded_at: "2026-11-18T14:00:00+00:00" };

  beforeEach(() => {
    vi.clearAllMocks();
    rpcResult.data = onboarded;
    rpcResult.error = null;
  });

  it("calls submit_risk_profile with the user's token (never the service role) and maps to camelCase", async () => {
    await expect(submitMyRiskProfile(user, "jwt", { answers })).resolves.toEqual({
      id: user.id,
      email: "ana@example.com",
      displayName: "Ana",
      riskScore: 15,
      riskProfile: "moderado",
      onboardedAt: "2026-11-18T14:00:00+00:00",
      createdAt: "2026-11-18T12:00:00+00:00",
    });
    expect(userClient).toHaveBeenCalledWith("jwt");
    expect(adminClient).not.toHaveBeenCalled();
    expect(rpc).toHaveBeenCalledWith("submit_risk_profile", { answers });
  });

  it("ignores extra fields such as risk_score (they never reach the rpc)", async () => {
    await submitMyRiskProfile(user, "jwt", { answers, risk_score: 24, risk_profile: "agresivo" });
    expect(rpc).toHaveBeenCalledWith("submit_risk_profile", { answers });
  });

  it.each([
    ["undefined", undefined],
    ["{}", {}],
    ["a string", { answers: "1,2" }],
    ["5 elements", { answers: [1, 2, 3, 4, 1] }],
    ["7 elements", { answers: [1, 2, 3, 4, 1, 2, 3] }],
    ["a 0", { answers: [0, 2, 3, 4, 1, 2] }],
    ["a 5", { answers: [5, 2, 3, 4, 1, 2] }],
    ["a 1.5", { answers: [1.5, 2, 3, 4, 1, 2] }],
    ['a "2"', { answers: ["2", 2, 3, 4, 1, 2] }],
    ["a null", { answers: [null, 2, 3, 4, 1, 2] }],
  ])("rejects %s with 400 VALIDATION_ERROR without calling the rpc", async (_label, input) => {
    await expect(submitMyRiskProfile(user, "jwt", input)).rejects.toMatchObject({
      status: 400,
      code: "VALIDATION_ERROR",
      message: "answers must be an array of 6 integers between 1 and 4",
    });
    expect(rpc).not.toHaveBeenCalled();
  });

  it("maps P0002 to 404 PROFILE_NOT_FOUND", async () => {
    rpcResult.data = null;
    rpcResult.error = { code: "P0002", message: "Profile not found" };
    await expect(submitMyRiskProfile(user, "jwt", { answers })).rejects.toMatchObject({
      status: 404,
      code: "PROFILE_NOT_FOUND",
    });
  });

  it("throws on any other Supabase error", async () => {
    rpcResult.error = { code: "42501", message: "boom" };
    await expect(submitMyRiskProfile(user, "jwt", { answers })).rejects.toThrow("boom");
  });

  it("throws when risk_profile is outside the enum", async () => {
    rpcResult.data = { ...onboarded, risk_profile: "yolo" };
    await expect(submitMyRiskProfile(user, "jwt", { answers })).rejects.toThrow();
  });
});
