import { cache } from "react";
import { api, type Me } from "./api";
import { getServerAccessToken } from "./supabase/server";

/** One GET /me per request even if Greeting and ProfileIdeas both ask. Returns null on any failure. */
export const getMe = cache(async (): Promise<Me | null> => {
  try {
    return await api.me({ token: await getServerAccessToken() });
  } catch {
    return null;
  }
});
