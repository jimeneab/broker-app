import { SignJWT } from "jose";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

const USER_ID = "5f0c2b4e-8a1d-4c3e-9b7a-1d2e3f4a5b6c";

// Fake Supabase: /me reads profiles through userClient.
let profileRow: unknown = null;
const rpc = vi.fn(async () => ({ data: profileRow, error: null }));
const userClient = vi.fn(() => ({
  from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: profileRow, error: null }) }) }) }),
  rpc,
}));
vi.mock("./lib/supabase.js", () => ({ userClient, adminClient: vi.fn() }));

const { app } = await import("./app.js");

/** HS256 token signed with the SUPABASE_JWT_SECRET from vitest.config.ts (no network). */
function validToken(): Promise<string> {
  return new SignJWT({ email: "ana@example.com" })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(USER_ID)
    .setIssuer("https://test-project.supabase.co/auth/v1")
    .setAudience("authenticated")
    .setExpirationTime("1h")
    .sign(new TextEncoder().encode(process.env.SUPABASE_JWT_SECRET));
}

describe("app", () => {
  beforeEach(() => {
    profileRow = null;
    userClient.mockClear();
    rpc.mockClear();
  });

  it("GET /health returns ok without a token", async () => {
    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: "ok" });
  });

  it("GET /me without a token returns 401", async () => {
    const res = await request(app).get("/me");
    expect(res.status).toBe(401);
    expect(res.body).toEqual({ error: { code: "UNAUTHORIZED", message: "Missing bearer token" } });
  });

  it("GET /me with a valid token returns the profile", async () => {
    profileRow = {
      id: USER_ID,
      display_name: "Ana",
      risk_score: null,
      risk_profile: null,
      onboarded_at: null,
      created_at: "2026-11-18T12:00:00.000Z",
    };
    const token = await validToken();
    const res = await request(app).get("/me").set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      id: USER_ID,
      email: "ana@example.com",
      displayName: "Ana",
      riskScore: null,
      riskProfile: null,
      onboardedAt: null,
      createdAt: "2026-11-18T12:00:00.000Z",
    });
    expect(userClient).toHaveBeenCalledWith(token);
  });

  it("GET /me without a profile row returns 404 PROFILE_NOT_FOUND", async () => {
    const res = await request(app).get("/me").set("Authorization", `Bearer ${await validToken()}`);
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: { code: "PROFILE_NOT_FOUND", message: "Profile not found" } });
  });

  it("unknown routes without a token return 401 (auth runs before the 404)", async () => {
    const res = await request(app).get("/nope");
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("UNAUTHORIZED");
  });

  it("unknown routes with a valid token return the 404 error shape", async () => {
    const res = await request(app).get("/nope").set("Authorization", `Bearer ${await validToken()}`);
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: { code: "NOT_FOUND", message: "Route GET /nope not found" } });
  });

  describe("PUT /me/risk-profile", () => {
    it("returns 401 without a token", async () => {
      const res = await request(app).put("/me/risk-profile").send({ answers: [3, 2, 3, 2, 3, 2] });
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe("UNAUTHORIZED");
    });

    it("returns 400 VALIDATION_ERROR for invalid answers", async () => {
      const res = await request(app)
        .put("/me/risk-profile")
        .set("Authorization", `Bearer ${await validToken()}`)
        .send({ answers: [1, 2, 3, 4, 5] });
      expect(res.status).toBe(400);
      expect(res.body).toEqual({
        error: { code: "VALIDATION_ERROR", message: "answers must be an array of 6 integers between 1 and 4" },
      });
      expect(rpc).not.toHaveBeenCalled();
    });

    it("returns 400 VALIDATION_ERROR for malformed JSON, even without a token", async () => {
      const res = await request(app).put("/me/risk-profile").set("Content-Type", "application/json").send("{");
      expect(res.status).toBe(400);
      expect(res.body).toEqual({ error: { code: "VALIDATION_ERROR", message: "Malformed JSON body" } });
    });

    it("returns 200 with the updated profile", async () => {
      profileRow = {
        id: USER_ID,
        display_name: "Ana",
        risk_score: 15,
        risk_profile: "moderado",
        onboarded_at: "2026-11-18T14:00:00.000Z",
        created_at: "2026-11-18T12:00:00.000Z",
      };
      const token = await validToken();
      const res = await request(app)
        .put("/me/risk-profile")
        .set("Authorization", `Bearer ${token}`)
        .send({ answers: [3, 2, 3, 2, 3, 2] });
      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        id: USER_ID,
        email: "ana@example.com",
        displayName: "Ana",
        riskScore: 15,
        riskProfile: "moderado",
        onboardedAt: "2026-11-18T14:00:00.000Z",
        createdAt: "2026-11-18T12:00:00.000Z",
      });
      expect(userClient).toHaveBeenCalledWith(token);
      expect(rpc).toHaveBeenCalledWith("submit_risk_profile", { answers: [3, 2, 3, 2, 3, 2] });
    });
  });
});
