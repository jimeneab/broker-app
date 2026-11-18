import { z } from "zod";

export const envSchema = z.object({
  PORT: z.coerce.number().int().positive().default(4000),
  CORS_ORIGIN: z.string().default("http://localhost:3000"),
  SUPABASE_URL: z.url(),
  SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  FINNHUB_API_KEY: z.string().min(1),
  TWELVEDATA_API_KEY: z.string().min(1),
  // Only for projects still on the legacy HS256 secret; JWKS (ES256/RS256) needs nothing.
  SUPABASE_JWT_SECRET: z.string().min(1).optional(),
});

export const env = envSchema.parse(process.env);
