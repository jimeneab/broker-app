import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError, type Me } from "./api";

vi.mock("@/lib/supabase/server", () => ({ getServerAccessToken: vi.fn(async () => "tok") }));
const me = vi.hoisted(() => vi.fn());
vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api")>();
  return { ...actual, api: { ...actual.api, me } };
});

const ME: Me = {
  id: "u1",
  email: "ana@example.com",
  displayName: "Ana",
  riskScore: 15,
  riskProfile: "moderado",
  onboardedAt: "2026-11-01T00:00:00Z",
  createdAt: "2026-11-01T00:00:00Z",
};

async function loadGetMe() {
  // React cache() does not memoize outside a server request, so a plain import is enough.
  return (await import("./me")).getMe;
}

describe("getMe", () => {
  beforeEach(() => me.mockReset());

  it("calls api.me with the server token and returns the user", async () => {
    me.mockResolvedValue(ME);
    const getMe = await loadGetMe();
    expect(await getMe()).toEqual(ME);
    expect(me).toHaveBeenCalledWith({ token: "tok" });
  });

  it("returns null when api.me rejects with an ApiError or any Error", async () => {
    const getMe = await loadGetMe();
    for (const err of [new ApiError(401, "UNAUTHORIZED", "no"), new Error("boom")]) {
      me.mockRejectedValueOnce(err);
      expect(await getMe()).toBeNull();
    }
  });
});
