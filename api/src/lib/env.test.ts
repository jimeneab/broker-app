import { describe, expect, it } from "vitest";
import { envSchema } from "./env.js";

const complete = {
  SUPABASE_URL: "https://x.supabase.co",
  SUPABASE_ANON_KEY: "anon",
  SUPABASE_SERVICE_ROLE_KEY: "service",
  FINNHUB_API_KEY: "fh",
  TWELVEDATA_API_KEY: "td",
};

describe("envSchema", () => {
  it("accepts a complete env and applies defaults", () => {
    const parsed = envSchema.parse(complete);
    expect(parsed.PORT).toBe(4000);
    expect(parsed.SUPABASE_URL).toBe(complete.SUPABASE_URL);
  });

  it.each(Object.keys(complete))("rejects when %s is missing, naming it", (name) => {
    const result = envSchema.safeParse({ ...complete, [name]: undefined });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual([name]);
  });

  it("rejects a SUPABASE_URL that is not a URL", () => {
    expect(envSchema.safeParse({ ...complete, SUPABASE_URL: "not-a-url" }).success).toBe(false);
  });

  it("SUPABASE_JWT_SECRET is optional but cannot be empty", () => {
    expect(envSchema.parse(complete).SUPABASE_JWT_SECRET).toBeUndefined();
    expect(envSchema.parse({ ...complete, SUPABASE_JWT_SECRET: "s" }).SUPABASE_JWT_SECRET).toBe("s");
    expect(envSchema.safeParse({ ...complete, SUPABASE_JWT_SECRET: "" }).success).toBe(false);
  });
});
