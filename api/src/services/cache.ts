import { adminClient } from "../lib/supabase.js";

/** Seconds. */
export const CACHE_TTL = {
  quote: 60,
  search: 86_400,
  news: 900,
  history: 43_200,
  profile: 604_800,
  metrics: 604_800,
} as const;

/**
 * Returns the cached payload for `key` while it is fresh; otherwise calls `fetcher` and stores the result.
 * Cache failures are logged and never break the request.
 */
export async function getOrSet<T>(key: string, ttlSeconds: number, fetcher: () => Promise<T>): Promise<T> {
  const db = adminClient();

  try {
    const { data, error } = await db
      .from("provider_cache")
      .select("payload, expires_at")
      .eq("key", key)
      .maybeSingle();
    if (error) throw error;
    // The payload was Zod-validated by the provider before it was stored, so the cast is safe.
    if (data && new Date(data.expires_at) > new Date()) return data.payload as T;
  } catch (err) {
    console.error(`[cache] read ${key} failed:`, err);
  }

  const value = await fetcher();
  // null/undefined means unknown symbol: do not store garbage rows.
  if (value === null || value === undefined) return value;

  try {
    const expires_at = new Date(Date.now() + ttlSeconds * 1000).toISOString();
    const { error } = await db.from("provider_cache").upsert({ key, payload: value, expires_at }, { onConflict: "key" });
    if (error) throw error;
  } catch (err) {
    console.error(`[cache] write ${key} failed:`, err);
  }
  return value;
}
