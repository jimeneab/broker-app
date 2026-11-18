import { beforeEach, describe, expect, it, vi } from "vitest";

const getSession = vi.fn();
type FakeClient = { auth: { getSession: typeof getSession } };
const createServerClient = vi.fn<(url: string, key: string, options: unknown) => FakeClient>(() => ({ auth: { getSession } }));
const createBrowserClient = vi.fn<(url: string, key: string) => FakeClient>(() => ({ auth: { getSession } }));
vi.mock("@supabase/ssr", () => ({ createServerClient, createBrowserClient }));

const cookieStore = { getAll: vi.fn(() => [{ name: "sb", value: "v" }]), set: vi.fn() };
vi.mock("next/headers", () => ({ cookies: async () => cookieStore }));

const { createSupabaseServerClient, getServerAccessToken } = await import("./server");
const { createSupabaseBrowserClient, getBrowserAccessToken } = await import("./client");

describe("supabase clients", () => {
  beforeEach(() => {
    getSession.mockReset();
    createServerClient.mockClear();
    cookieStore.set.mockReset();
  });

  it("server client uses the public URL, anon key and the request cookies", async () => {
    await createSupabaseServerClient();
    const [url, key, options] = createServerClient.mock.calls[0] as unknown as [
      string,
      string,
      { cookies: { getAll: () => unknown; setAll: (list: { name: string; value: string; options: object }[]) => void } },
    ];
    expect(url).toBe("https://test-project.supabase.co");
    expect(key).toBe("test-anon-key");
    expect(options.cookies.getAll()).toEqual([{ name: "sb", value: "v" }]);

    // Server Components cannot write cookies: setAll must swallow the error.
    cookieStore.set.mockImplementation(() => {
      throw new Error("read-only");
    });
    expect(() => options.cookies.setAll([{ name: "a", value: "b", options: {} }])).not.toThrow();
  });

  it("browser client uses the public URL and anon key", () => {
    createSupabaseBrowserClient();
    expect(createBrowserClient).toHaveBeenCalledWith("https://test-project.supabase.co", "test-anon-key");
  });

  it("access token helpers return the token or null", async () => {
    getSession.mockResolvedValueOnce({ data: { session: { access_token: "jwt" } } });
    await expect(getServerAccessToken()).resolves.toBe("jwt");
    getSession.mockResolvedValueOnce({ data: { session: null } });
    await expect(getServerAccessToken()).resolves.toBeNull();
    getSession.mockResolvedValueOnce({ data: { session: { access_token: "jwt2" } } });
    await expect(getBrowserAccessToken()).resolves.toBe("jwt2");
    getSession.mockResolvedValueOnce({ data: { session: null } });
    await expect(getBrowserAccessToken()).resolves.toBeNull();
  });
});
