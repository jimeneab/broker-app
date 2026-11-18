import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

const profileRowSchema = z.object({
  id: z.string(),
  display_name: z.string(),
  risk_score: z.number().int().nullable(),
  risk_profile: z.enum(["conservador", "moderado", "agresivo"]).nullable(),
  onboarded_at: z.string().nullable(),
  created_at: z.string(),
});

export type ProfileRow = z.infer<typeof profileRowSchema>;

export async function findProfileById(client: SupabaseClient, id: string): Promise<ProfileRow | null> {
  const { data, error } = await client
    .from("profiles")
    .select("id, display_name, risk_score, risk_profile, onboarded_at, created_at")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(`Failed to read profile: ${error.message}`);
  return data === null ? null : profileRowSchema.parse(data);
}

/** Calls the security definer function: the database sums, classifies and writes only auth.uid()'s row. */
export async function submitRiskProfile(client: SupabaseClient, answers: number[]): Promise<ProfileRow | null> {
  const { data, error } = await client.rpc("submit_risk_profile", { answers });
  if (error?.code === "P0002") return null;
  if (error) throw new Error(`Failed to submit risk profile: ${error.message}`);
  return profileRowSchema.parse(data);
}
