import type { Request, RequestHandler } from "express";
import { createRemoteJWKSet, decodeProtectedHeader, jwtVerify, type JWTVerifyGetKey } from "jose";
import { z } from "zod";
import { env } from "../lib/env.js";
import { AppError } from "./errorHandler.js";

export interface AuthUser {
  id: string;
  email: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
      /** Raw JWT, for userClient(jwt). */
      accessToken?: string;
    }
  }
}

const AUDIENCE = "authenticated";
const claimsSchema = z.object({ sub: z.uuid(), email: z.string() });

export function supabaseAuthUrls(supabaseUrl: string): { issuer: string; jwksUrl: URL } {
  const issuer = `${supabaseUrl.replace(/\/+$/, "")}/auth/v1`;
  return { issuer, jwksUrl: new URL(`${issuer}/.well-known/jwks.json`) };
}

const missingToken = () => new AppError(401, "UNAUTHORIZED", "Missing bearer token");
const invalidToken = () => new AppError(401, "UNAUTHORIZED", "Invalid or expired token");

export function createRequireAuth(opts: {
  supabaseUrl: string;
  /** Legacy HS256 fallback. */
  jwtSecret?: string;
  /** Injectable in tests; defaults to the project's remote JWKS. */
  jwks?: JWTVerifyGetKey;
}): RequestHandler {
  const { issuer, jwksUrl } = supabaseAuthUrls(opts.supabaseUrl);
  // Lazy per-instance cache: only an optimization, a cold instance just fetches the JWKS again.
  let jwks = opts.jwks;

  return async (req, _res, next) => {
    const token = /^Bearer\s+(\S+)$/i.exec(req.get("authorization") ?? "")?.[1];
    if (!token) throw missingToken();

    try {
      const { alg } = decodeProtectedHeader(token);
      // Fixed algorithm list per branch prevents algorithm confusion and alg:none.
      let payload: unknown;
      if (alg === "HS256") {
        if (!opts.jwtSecret) throw invalidToken();
        const key = new TextEncoder().encode(opts.jwtSecret);
        ({ payload } = await jwtVerify(token, key, { issuer, audience: AUDIENCE, algorithms: ["HS256"], requiredClaims: ["exp", "sub"] }));
      } else {
        jwks ??= createRemoteJWKSet(jwksUrl);
        ({ payload } = await jwtVerify(token, jwks, { issuer, audience: AUDIENCE, algorithms: ["ES256", "RS256"], requiredClaims: ["exp", "sub"] }));
      }
      const claims = claimsSchema.parse(payload);
      req.user = { id: claims.sub, email: claims.email };
      req.accessToken = token;
    } catch {
      throw invalidToken();
    }
    next();
  };
}

export const requireAuth = createRequireAuth({
  supabaseUrl: env.SUPABASE_URL,
  jwtSecret: env.SUPABASE_JWT_SECRET,
});

/** For controllers: the user and token set by requireAuth, or 401 if it did not run. */
export function getAuth(req: Request): { user: AuthUser; token: string } {
  if (!req.user || !req.accessToken) throw new AppError(401, "UNAUTHORIZED", "Missing bearer token");
  return { user: req.user, token: req.accessToken };
}
