import express, { type Request } from "express";
import { createLocalJWKSet, exportJWK, generateKeyPair, SignJWT, type CryptoKey, type JWK } from "jose";
import request from "supertest";
import { beforeAll, describe, expect, it } from "vitest";
import { createRequireAuth, getAuth, supabaseAuthUrls } from "./auth.js";
import { errorHandler } from "./errorHandler.js";

const SUPABASE_URL = "https://x.supabase.co";
const ISSUER = `${SUPABASE_URL}/auth/v1`;
const SECRET = "unit-test-secret-with-at-least-32-chars";
const USER_ID = "5f0c2b4e-8a1d-4c3e-9b7a-1d2e3f4a5b6c";
const KID = "test-kid";

let privateKey: CryptoKey;
let otherPrivateKey: CryptoKey;
let jwk: JWK;

beforeAll(async () => {
  const pair = await generateKeyPair("ES256");
  privateKey = pair.privateKey;
  otherPrivateKey = (await generateKeyPair("ES256")).privateKey;
  jwk = { ...(await exportJWK(pair.publicKey)), kid: KID, alg: "ES256" };
});

type TokenOverrides = { sub?: string; iss?: string; aud?: string | null; exp?: string | number; email?: string | null };

function claims(o: TokenOverrides) {
  const jwt = new SignJWT(o.email === null ? {} : { email: o.email ?? "ana@example.com" })
    .setSubject(o.sub ?? USER_ID)
    .setIssuer(o.iss ?? ISSUER)
    .setIssuedAt()
    .setExpirationTime(o.exp ?? "1h");
  return o.aud === null ? jwt : jwt.setAudience(o.aud ?? "authenticated");
}

const es256 = (o: TokenOverrides = {}, key = privateKey) => claims(o).setProtectedHeader({ alg: "ES256", kid: KID }).sign(key);
const hs256 = (secret: string, o: TokenOverrides = {}) =>
  claims(o).setProtectedHeader({ alg: "HS256" }).sign(new TextEncoder().encode(secret));

function makeApp(jwtSecret?: string) {
  const app = express();
  app.use(createRequireAuth({ supabaseUrl: SUPABASE_URL, jwtSecret, jwks: createLocalJWKSet({ keys: [jwk] }) }));
  app.get("/whoami", (req, res) => {
    res.json({ user: req.user, token: req.accessToken });
  });
  app.use(errorHandler);
  return app;
}

const INVALID = { error: { code: "UNAUTHORIZED", message: "Invalid or expired token" } };
const MISSING = { error: { code: "UNAUTHORIZED", message: "Missing bearer token" } };

async function call(authorization?: string, jwtSecret: string | null = SECRET) {
  const req = request(makeApp(jwtSecret ?? undefined)).get("/whoami");
  return authorization === undefined ? req : req.set("Authorization", authorization);
}

describe("requireAuth", () => {
  it("rejects a request without Authorization header", async () => {
    const res = await call();
    expect(res.status).toBe(401);
    expect(res.body).toEqual(MISSING);
  });

  it("rejects a non-bearer scheme", async () => {
    const res = await call("Basic x");
    expect(res.status).toBe(401);
    expect(res.body).toEqual(MISSING);
  });

  it("rejects a malformed token", async () => {
    const res = await call("Bearer basura");
    expect(res.status).toBe(401);
    expect(res.body).toEqual(INVALID);
  });

  it("accepts a valid ES256 token and sets req.user and req.accessToken", async () => {
    const token = await es256();
    const res = await call(`Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ user: { id: USER_ID, email: "ana@example.com" }, token });
  });

  it.each<[string, TokenOverrides]>([
    ["expired", { exp: Math.floor(Date.now() / 1000) - 60 }],
    ["wrong issuer", { iss: "https://evil.supabase.co/auth/v1" }],
    ["wrong audience", { aud: "anon" }],
    ["missing audience", { aud: null }],
    ["sub not a uuid", { sub: "not-a-uuid" }],
    ["missing email", { email: null }],
  ])("rejects an ES256 token with %s", async (_name, overrides) => {
    const res = await call(`Bearer ${await es256(overrides)}`);
    expect(res.status).toBe(401);
    expect(res.body).toEqual(INVALID);
  });

  it("rejects a token signed with another key pair", async () => {
    const res = await call(`Bearer ${await es256({}, otherPrivateKey)}`);
    expect(res.body).toEqual(INVALID);
  });

  it("rejects alg: none", async () => {
    const b64 = (o: object) => Buffer.from(JSON.stringify(o)).toString("base64url");
    const exp = Math.floor(Date.now() / 1000) + 3600;
    const token = `${b64({ alg: "none" })}.${b64({ sub: USER_ID, email: "a@b.c", iss: ISSUER, aud: "authenticated", exp })}.`;
    const res = await call(`Bearer ${token}`);
    expect(res.status).toBe(401);
    expect(res.body).toEqual(INVALID);
  });

  it("accepts HS256 signed with the configured secret", async () => {
    const res = await call(`Bearer ${await hs256(SECRET)}`);
    expect(res.status).toBe(200);
    expect(res.body.user).toEqual({ id: USER_ID, email: "ana@example.com" });
  });

  it("rejects HS256 signed with another secret", async () => {
    const res = await call(`Bearer ${await hs256("another-secret-with-at-least-32-chars!!")}`);
    expect(res.body).toEqual(INVALID);
  });

  it("rejects HS256 when no secret is configured", async () => {
    const res = await call(`Bearer ${await hs256(SECRET)}`, null);
    expect(res.status).toBe(401);
    expect(res.body).toEqual(INVALID);
  });
});

describe("supabaseAuthUrls", () => {
  it("builds issuer and JWKS URL, ignoring a trailing slash", () => {
    const { issuer, jwksUrl } = supabaseAuthUrls("https://x.supabase.co/");
    expect(issuer).toBe("https://x.supabase.co/auth/v1");
    expect(jwksUrl.href).toBe("https://x.supabase.co/auth/v1/.well-known/jwks.json");
  });
});

describe("getAuth", () => {
  it("throws 401 when requireAuth did not run", () => {
    expect(() => getAuth({} as Request)).toThrow(expect.objectContaining({ status: 401, code: "UNAUTHORIZED" }));
  });

  it("returns user and token", () => {
    const user = { id: USER_ID, email: "a@b.c" };
    expect(getAuth({ user, accessToken: "t" } as Request)).toEqual({ user, token: "t" });
  });
});
