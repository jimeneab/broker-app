import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

type Row = { payload: unknown; expires_at: string };

// Minimal fake of the supabase-js query builder used by getOrSet, backed by a Map.
const store = new Map<string, Row>();
const failures = { read: false, write: false };
const upsert = vi.fn(async (row: Row & { key: string }) => {
  if (failures.write) return { error: { message: "write failed" } };
  store.set(row.key, { payload: row.payload, expires_at: row.expires_at });
  return { error: null };
});
const fakeClient = {
  from: () => ({
    select: () => ({
      eq: (_column: string, key: string) => ({
        maybeSingle: async () =>
          failures.read ? { data: null, error: { message: "read failed" } } : { data: store.get(key) ?? null, error: null },
      }),
    }),
    upsert,
  }),
};
vi.mock("../lib/supabase.js", () => ({ adminClient: () => fakeClient }));

const { getOrSet, CACHE_TTL } = await import("./cache.js");

describe("getOrSet", () => {
  beforeEach(() => {
    store.clear();
    failures.read = false;
    failures.write = false;
    upsert.mockClear();
    vi.spyOn(console, "error").mockImplementation(() => {});
  });
  afterEach(() => vi.restoreAllMocks());

  it("on miss calls the fetcher and upserts with expires_at = now + ttl", async () => {
    const fetcher = vi.fn().mockResolvedValue({ price: 1 });
    const before = Date.now();
    await expect(getOrSet("k", 60, fetcher)).resolves.toEqual({ price: 1 });
    expect(fetcher).toHaveBeenCalledOnce();
    const [row, options] = upsert.mock.calls[0] as unknown as [Row & { key: string }, unknown];
    expect(row.key).toBe("k");
    expect(options).toEqual({ onConflict: "key" });
    const expires = new Date(row.expires_at).getTime();
    expect(expires).toBeGreaterThanOrEqual(before + 60_000);
    expect(expires).toBeLessThanOrEqual(Date.now() + 60_000);
  });

  it("a second call within the TTL does not reach the provider", async () => {
    const fetcher = vi.fn().mockResolvedValue({ price: 1 });
    await getOrSet("finnhub:quote:AAPL", CACHE_TTL.quote, fetcher);
    await expect(getOrSet("finnhub:quote:AAPL", CACHE_TTL.quote, fetcher)).resolves.toEqual({ price: 1 });
    expect(fetcher).toHaveBeenCalledOnce();
  });

  it("on a fresh hit returns the payload without calling the fetcher", async () => {
    store.set("k", { payload: "cached", expires_at: new Date(Date.now() + 10_000).toISOString() });
    const fetcher = vi.fn();
    await expect(getOrSet("k", 60, fetcher)).resolves.toBe("cached");
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("on an expired row calls the fetcher", async () => {
    store.set("k", { payload: "old", expires_at: new Date(Date.now() - 1000).toISOString() });
    const fetcher = vi.fn().mockResolvedValue("new");
    await expect(getOrSet("k", 60, fetcher)).resolves.toBe("new");
    expect(fetcher).toHaveBeenCalledOnce();
  });

  it("propagates fetcher errors without writing", async () => {
    await expect(getOrSet("k", 60, () => Promise.reject(new Error("boom")))).rejects.toThrow("boom");
    expect(upsert).not.toHaveBeenCalled();
  });

  it("does not store null results", async () => {
    await expect(getOrSet("k", 60, async () => null)).resolves.toBeNull();
    expect(upsert).not.toHaveBeenCalled();
  });

  it("falls back to the fetcher when the read fails", async () => {
    failures.read = true;
    const fetcher = vi.fn().mockResolvedValue("fresh");
    await expect(getOrSet("k", 60, fetcher)).resolves.toBe("fresh");
    expect(console.error).toHaveBeenCalled();
  });

  it("returns the value when the write fails", async () => {
    failures.write = true;
    await expect(getOrSet("k", 60, async () => "fresh")).resolves.toBe("fresh");
    expect(console.error).toHaveBeenCalled();
  });

  it("defines the TTLs from the spec", () => {
    expect(CACHE_TTL).toEqual({
      quote: 60,
      search: 86_400,
      news: 900,
      history: 43_200,
      profile: 604_800,
      metrics: 604_800,
    });
  });
});
