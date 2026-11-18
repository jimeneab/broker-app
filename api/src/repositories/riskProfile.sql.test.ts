import { readFileSync } from "node:fs";
import { PGlite, type Transaction } from "@electric-sql/pglite";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";

// Runs the real F01 + F02 migrations on an in-memory Postgres (no Supabase, no network).
const migration = (name: string) => readFileSync(new URL(`../../../supabase/migrations/${name}`, import.meta.url), "utf8");

// Mimics what Supabase ships by default (roles, auth schema, auth.uid(), default privileges).
const PRELUDE = `
create role anon nologin;
create role authenticated nologin;
create role service_role nologin;
create schema auth;
create table auth.users (id uuid primary key, email text, raw_user_meta_data jsonb);
create function auth.uid() returns uuid language sql stable as $$
  select (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')::uuid
$$;
grant usage on schema public, auth to anon, authenticated, service_role;
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
`;

const A = "11111111-1111-4111-8111-111111111111";
const B = "22222222-2222-4222-8222-222222222222";

interface ProfileRow {
  id: string;
  risk_score: number | null;
  risk_profile: string | null;
  onboarded_at: Date | null;
}

let db: PGlite;

/** Runs `fn` as the given user (role authenticated + JWT claims) and always rolls back the role switch. */
async function asUser<T>(sub: string | null, fn: (tx: Transaction) => Promise<T>, role = "authenticated"): Promise<T> {
  return db.transaction(async (tx) => {
    await tx.exec(`set local role ${role}`);
    if (sub) await tx.query("select set_config('request.jwt.claims', $1, true)", [JSON.stringify({ sub, role })]);
    return fn(tx);
  });
}

const submit = (sub: string | null, answers: unknown, role?: string) =>
  asUser(
    sub,
    async (tx) => (await tx.query<ProfileRow>("select * from public.submit_risk_profile($1::int[])", [answers])).rows[0],
    role,
  );

async function profileOf(id: string): Promise<ProfileRow> {
  return (await db.query<ProfileRow>("select * from public.profiles where id = $1", [id])).rows[0];
}

beforeAll(async () => {
  db = new PGlite();
  await db.exec(PRELUDE);
  await db.exec(migration("20261118130000_f01_profiles.sql"));
  await db.exec(migration("20261118140000_f02_risk_profile.sql"));
  // The F01 trigger creates both profiles.
  await db.query("insert into auth.users (id, email) values ($1, 'a@example.com'), ($2, 'b@example.com')", [A, B]);
});

beforeEach(async () => {
  // Superuser reset (bypasses the column grants on purpose).
  await db.exec("update public.profiles set risk_score = null, risk_profile = null, onboarded_at = null");
});

describe("submit_risk_profile", () => {
  it.each([
    [[1, 1, 1, 2, 3, 3], 11, "conservador"],
    [[2, 2, 2, 2, 2, 2], 12, "moderado"],
    [[3, 3, 3, 3, 3, 3], 18, "moderado"],
    [[4, 3, 3, 3, 3, 3], 19, "agresivo"],
    [[1, 1, 1, 1, 1, 1], 6, "conservador"],
    [[4, 4, 4, 4, 4, 4], 24, "agresivo"],
  ])("%j → %i %s", async (answers, score, profile) => {
    const row = await submit(A, answers);
    expect(row).toMatchObject({ id: A, risk_score: score, risk_profile: profile });
    expect(row.onboarded_at).not.toBeNull();
  });

  it("redoing overwrites score and profile and keeps the original onboarded_at", async () => {
    const first = await submit(A, [1, 1, 1, 1, 1, 1]);
    const second = await submit(A, [4, 4, 4, 4, 4, 4]);
    expect(second).toMatchObject({ risk_score: 24, risk_profile: "agresivo" });
    expect(second.onboarded_at).toEqual(first.onboarded_at);
  });

  it("only writes the caller's row", async () => {
    await submit(A, [2, 2, 2, 2, 2, 2]);
    expect(await profileOf(B)).toMatchObject({ risk_score: null, risk_profile: null, onboarded_at: null });
  });

  it.each([
    ["5 elements", [1, 2, 3, 4, 1]],
    ["7 elements", [1, 2, 3, 4, 1, 2, 3]],
    ["a 0", [0, 2, 3, 4, 1, 2]],
    ["a 5", [5, 2, 3, 4, 1, 2]],
    ["a null", [1, 2, null, 4, 1, 2]],
    ["2 dimensions", "{{1,2,3},{4,1,2}}"],
    ["null", null],
    ["empty", "{}"],
  ])("rejects %s with 22023 and changes nothing", async (_label, answers) => {
    await expect(submit(A, answers)).rejects.toMatchObject({ code: "22023" });
    expect(await profileOf(A)).toMatchObject({ risk_score: null, risk_profile: null, onboarded_at: null });
  });

  it("rejects a call without JWT claims with 42501", async () => {
    await expect(submit(null, [2, 2, 2, 2, 2, 2])).rejects.toMatchObject({ code: "42501" });
  });

  it("anon cannot execute it", async () => {
    await expect(submit(A, [2, 2, 2, 2, 2, 2], "anon")).rejects.toThrow(/permission denied for function/);
  });
});

describe("skipping the calculation with a direct update", () => {
  it.each(["risk_score = 24", "risk_profile = 'agresivo'", "onboarded_at = now()"])(
    "set %s → permission denied",
    async (assignment) => {
      await expect(
        asUser(A, (tx) => tx.query(`update public.profiles set ${assignment} where id = $1`, [A])),
      ).rejects.toMatchObject({ code: "42501" });
    },
  );

  it("display_name is still writable (F01 regression)", async () => {
    const res = await asUser(A, (tx) => tx.query("update public.profiles set display_name = 'Nuevo' where id = $1", [A]));
    expect(res.affectedRows).toBe(1);
  });
});
