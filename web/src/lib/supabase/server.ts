import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { publicEnv } from "../env";

export async function createSupabaseServerClient(): Promise<SupabaseClient> {
  const cookieStore = await cookies();
  return createServerClient(publicEnv.NEXT_PUBLIC_SUPABASE_URL, publicEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (list) => {
        try {
          list.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Called from a Server Component, where cookies are read-only: proxy.ts (F01) refreshes the session.
        }
      },
    },
  });
}

/** The API verifies the JWT (F01), so reading the session from the cookie is enough here. */
export async function getServerAccessToken(): Promise<string | null> {
  const client = await createSupabaseServerClient();
  const { data } = await client.auth.getSession();
  return data.session?.access_token ?? null;
}
