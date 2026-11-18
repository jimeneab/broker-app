// @vitest-environment node
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

type CookieToSet = { name: string; value: string; options: object };
type CookieAdapter = { getAll: () => unknown; setAll: (list: CookieToSet[]) => void };

const state: {
  userId: string | null;
  profile: { onboarded_at: string | null } | null;
  profileError: { message: string } | null;
  refreshCookies: CookieToSet[] | null;
} = { userId: null, profile: null, profileError: null, refreshCookies: null };

const from = vi.fn(() => ({
  select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: state.profile, error: state.profileError }) }) }),
}));

const createServerClient = vi.fn((_url: string, _key: string, options: { cookies: CookieAdapter }) => ({
  auth: {
    getClaims: async () => {
      // Simulates @supabase/ssr writing refreshed session cookies.
      if (state.refreshCookies) options.cookies.setAll(state.refreshCookies);
      return { data: state.userId ? { claims: { sub: state.userId } } : null, error: null };
    },
  },
  from,
}));
vi.mock("@supabase/ssr", () => ({ createServerClient }));

const { proxy, config } = await import("./proxy");

const run = (path: string) => proxy(new NextRequest(`http://localhost:3000${path}`));

function expectRedirect(res: Response, path: string) {
  expect(res.status).toBe(307);
  expect(res.headers.get("location")).toBe(`http://localhost:3000${path}`);
}

const passes = (res: Response) => expect(res.headers.get("x-middleware-next")).toBe("1");

describe("proxy", () => {
  beforeEach(() => {
    Object.assign(state, { userId: null, profile: null, profileError: null, refreshCookies: null });
    from.mockClear();
  });

  it("redirects to /login without a session", async () => {
    expectRedirect(await run("/"), "/login");
    expectRedirect(await run("/stocks/AAPL"), "/login");
  });

  it.each(["/login", "/signup"])("lets %s through without a session", async (path) => {
    passes(await run(path));
  });

  describe("with a session", () => {
    beforeEach(() => {
      state.userId = "user-1";
    });

    it.each(["/login", "/signup"])("redirects %s to /", async (path) => {
      expectRedirect(await run(path), "/");
    });

    it("redirects to /onboarding when onboarded_at is null", async () => {
      state.profile = { onboarded_at: null };
      expectRedirect(await run("/"), "/onboarding");
    });

    it("redirects to /onboarding when there is no profile row", async () => {
      expectRedirect(await run("/"), "/onboarding");
    });

    it("lets an onboarded user through", async () => {
      state.profile = { onboarded_at: "2026-11-18T12:00:00Z" };
      passes(await run("/"));
    });

    it("lets /onboarding through without querying profiles", async () => {
      passes(await run("/onboarding"));
      expect(from).not.toHaveBeenCalled();
    });

    it("lets the request through when the profile query fails", async () => {
      state.profileError = { message: "boom" };
      passes(await run("/"));
    });

    it("copies refreshed session cookies onto redirects", async () => {
      state.refreshCookies = [{ name: "sb-test-auth-token", value: "fresh", options: { path: "/" } }];
      const res = await run("/login");
      expectRedirect(res, "/");
      expect(res.cookies.get("sb-test-auth-token")?.value).toBe("fresh");
    });
  });

  it("matcher skips static assets and covers app routes", () => {
    const re = new RegExp(`^${config.matcher[0]}$`);
    expect(re.test("/_next/static/x.js")).toBe(false);
    expect(re.test("/logo.png")).toBe(false);
    expect(re.test("/favicon.ico")).toBe(false);
    expect(re.test("/")).toBe(true);
    expect(re.test("/stocks/AAPL")).toBe(true);
  });
});
