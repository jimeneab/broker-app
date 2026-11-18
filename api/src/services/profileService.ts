import { z } from "zod";
import { userClient } from "../lib/supabase.js";
import type { AuthUser } from "../middlewares/auth.js";
import { AppError } from "../middlewares/errorHandler.js";
import { findProfileById, submitRiskProfile, type ProfileRow } from "../repositories/profileRepository.js";

export interface Me {
  id: string;
  email: string;
  displayName: string;
  riskScore: number | null;
  riskProfile: ProfileRow["risk_profile"];
  onboardedAt: string | null;
  createdAt: string;
}

// Shape only: the sum and the thresholds live solely in the submit_risk_profile SQL function.
export const riskProfileInputSchema = z.object({
  answers: z.array(z.number().int().min(1).max(4)).length(6),
});

function toMe(row: ProfileRow, email: string): Me {
  return {
    id: row.id,
    email,
    displayName: row.display_name,
    riskScore: row.risk_score,
    riskProfile: row.risk_profile,
    onboardedAt: row.onboarded_at,
    createdAt: row.created_at,
  };
}

const profileNotFound = () => new AppError(404, "PROFILE_NOT_FOUND", "Profile not found");

/** Reads with the user's JWT (never the service role), so RLS applies. */
export async function getMyProfile(user: AuthUser, token: string): Promise<Me> {
  const row = await findProfileById(userClient(token), user.id);
  if (!row) throw profileNotFound();
  return toMe(row, user.email);
}

/** Takes `unknown` so REST, MCP and chat validate the same way. Never uses the service role. */
export async function submitMyRiskProfile(user: AuthUser, token: string, input: unknown): Promise<Me> {
  const parsed = riskProfileInputSchema.safeParse(input);
  if (!parsed.success) {
    throw new AppError(400, "VALIDATION_ERROR", "answers must be an array of 6 integers between 1 and 4");
  }
  const row = await submitRiskProfile(userClient(token), parsed.data.answers);
  if (!row) throw profileNotFound();
  return toMe(row, user.email);
}
