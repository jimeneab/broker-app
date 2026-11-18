import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { env } from "./env.js";

const auth = { persistSession: false, autoRefreshToken: false };

/** Service role: bypasses RLS. Only for provider_cache and stock_catalog. */
export function adminClient(): SupabaseClient {
  return createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth });
}

/** Anon key + the user's JWT, so RLS applies (F01+). */
export function userClient(jwt: string): SupabaseClient {
  return createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
    auth,
    global: { headers: { Authorization: `Bearer ${jwt}` } },
  });
}
