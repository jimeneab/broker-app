import Link from "next/link";
import { api } from "@/lib/api";
import { logout } from "@/lib/auth/actions";
import { getServerAccessToken } from "@/lib/supabase/server";

const exitClass = "text-sm text-muted underline-offset-4 hover:text-foreground hover:underline";

/** Already onboarded → back to the app without changing the profile; otherwise (or if /me fails) the only safe exit is logout. */
export async function OnboardingExit() {
  let onboarded = false;
  try {
    const token = await getServerAccessToken();
    onboarded = (await api.me({ token })).onboardedAt !== null;
  } catch {
    // Not blocking: the questionnaire stays usable and we fall back to logout.
  }

  return (
    <div className="mt-6 border-t border-border pt-4 text-center">
      {onboarded ? (
        <Link href="/" className={exitClass}>
          Volver a la app
        </Link>
      ) : (
        <form action={logout}>
          <button type="submit" className={exitClass}>
            Cerrar sesión
          </button>
        </form>
      )}
    </div>
  );
}
