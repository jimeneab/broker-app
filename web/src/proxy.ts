import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { publicEnv } from "./lib/env";

/** Refreshes the Supabase session cookies and routes by auth/onboarding state. */
export async function proxy(request: NextRequest): Promise<NextResponse> {
  let response = NextResponse.next({ request });

  // lib/supabase/server.ts uses next/headers, which is not available here.
  const supabase = createServerClient(publicEnv.NEXT_PUBLIC_SUPABASE_URL, publicEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (list) => {
        list.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        list.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  // getClaims verifies the JWT (getSession does not) and refreshes an expired session.
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims.sub;
  const { pathname } = request.nextUrl;
  const isAuthPage = pathname === "/login" || pathname === "/signup";

  const redirectTo = (path: string) => {
    const redirect = NextResponse.redirect(new URL(path, request.url));
    // Keep a refreshed session on redirects too.
    response.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
    return redirect;
  };

  if (!userId) return isAuthPage ? response : redirectTo("/login");
  if (isAuthPage) return redirectTo("/");

  if (pathname !== "/onboarding") {
    const { data: profile, error } = await supabase.from("profiles").select("onboarded_at").eq("id", userId).maybeSingle();
    // On a transient error let the page handle it instead of locking the user out.
    if (!error && !profile?.onboarded_at) return redirectTo("/onboarding");
  }
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
