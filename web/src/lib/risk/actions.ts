"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { api, errorMessage } from "../api";
import { getServerAccessToken } from "../supabase/server";
import type { RiskProfile } from "./questions";

export type SubmitRiskProfileResult =
  | { ok: true; riskScore: number; riskProfile: RiskProfile }
  | { ok: false; error: string };

const answersSchema = z.array(z.number().int().min(1).max(4)).length(6);

/** Public POST endpoint: validates again and lets the API (the SQL function) compute the profile. */
export async function submitRiskProfile(answers: number[]): Promise<SubmitRiskProfileResult> {
  const parsed = answersSchema.safeParse(answers);
  if (!parsed.success) return { ok: false, error: "Revisa tus respuestas e intenta de nuevo." };

  const token = await getServerAccessToken();
  if (!token) return { ok: false, error: "Tu sesión expiró. Inicia sesión de nuevo." };

  let me;
  try {
    me = await api.saveRiskProfile(parsed.data, { token });
  } catch (err) {
    return { ok: false, error: errorMessage(err) };
  }
  if (me.riskScore === null || me.riskProfile === null) return { ok: false, error: errorMessage(null) };

  // Purges the Client Cache, which may hold / from before onboarding (or an old profile after redoing it).
  revalidatePath("/", "layout");
  return { ok: true, riskScore: me.riskScore, riskProfile: me.riskProfile };
}
