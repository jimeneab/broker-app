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
// provider_cache always misses, so every request reaches the mocked marketData.
const missingCache = {
  from: () => ({
    select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null, error: null }) }) }),
    upsert: async () => ({ error: null }),
  }),
};
vi.mock("./lib/supabase.js", () => ({ userClient, adminClient: () => missingCache }));

const marketData = { search: vi.fn(), quote: vi.fn(), profile: vi.fn(), metrics: vi.fn(), history: vi.fn() };
vi.mock("./providers/index.js", () => ({ marketData }));

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
  describe("stocks", () => {
    const quote = {
      symbol: "AAPL",
      price: 189.84,
      change: 2.31,
      changePercent: 1.23,
      high: 190.1,
      low: 186.9,
      open: 187.2,
      previousClose: 187.53,
      timestamp: 1795545600,
    };
    const auth = async () => ({ Authorization: `Bearer ${await validToken()}` });

    beforeEach(() => {
      Object.values(marketData).forEach((fn) => fn.mockReset());
      marketData.search.mockResolvedValue([{ symbol: "AAPL", name: "APPLE INC", type: "Common Stock" }]);
      marketData.quote.mockResolvedValue(quote);
      marketData.profile.mockResolvedValue(null);
      marketData.metrics.mockResolvedValue(null);
      marketData.history.mockResolvedValue([
        { date: "2026-11-12", open: 1, high: 2, low: 0.5, close: 1.5, volume: 10 },
        { date: "2026-11-13", open: 1, high: 2, low: 0.5, close: 1.5, volume: null },
      ]);
    });

    it("GET /stocks/search?q=apple returns the results", async () => {
      const res = await request(app).get("/stocks/search?q=apple").set(await auth());
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ query: "apple", results: [{ symbol: "AAPL", name: "APPLE INC", type: "stock" }] });
    });

    it("GET /stocks/search without q returns 400 and is not taken as a symbol", async () => {
      const res = await request(app).get("/stocks/search").set(await auth());
      expect(res.status).toBe(400);
      expect(res.body).toEqual({ error: { code: "VALIDATION_ERROR", message: "q must be 1 to 50 characters" } });
      expect(marketData.quote).not.toHaveBeenCalled();
    });

    it("GET /stocks/AAPL returns the detail", async () => {
      const res = await request(app).get("/stocks/AAPL").set(await auth());
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ symbol: "AAPL", quote, profile: null, metrics: null });
    });

    it("GET /stocks/ZZZZZ returns 404 SYMBOL_NOT_FOUND", async () => {
      marketData.quote.mockResolvedValue(null);
      const res = await request(app).get("/stocks/ZZZZZ").set(await auth());
      expect(res.status).toBe(404);
      expect(res.body).toEqual({ error: { code: "SYMBOL_NOT_FOUND", message: "Symbol not found" } });
    });

    it("GET /stocks/AAPL/history?range=6M returns the candles", async () => {
      const res = await request(app).get("/stocks/AAPL/history?range=6M").set(await auth());
      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ symbol: "AAPL", range: "6M", interval: "1day" });
      expect(res.body.candles).toHaveLength(2);
    });

    it("GET /stocks/AAPL/history?range=2Y returns 400", async () => {
      const res = await request(app).get("/stocks/AAPL/history?range=2Y").set(await auth());
      expect(res.status).toBe(400);
      expect(res.body.error).toEqual({ code: "VALIDATION_ERROR", message: "range must be one of 1M, 6M, 1Y, 5Y" });
    });

    it.each(["/stocks/search?q=apple", "/stocks/AAPL", "/stocks/AAPL/history?range=6M"])(
      "%s without a token returns 401",
      async (path) => {
        const res = await request(app).get(path);
        expect(res.status).toBe(401);
        expect(res.body.error.code).toBe("UNAUTHORIZED");
      },
    );
  });
});
