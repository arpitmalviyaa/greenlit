import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/types/database.types";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  // Public routes that don't require auth
  const publicRoutes = ["/login", "/signup", "/auth/callback", "/invite", "/pricing"];
  const isPublicRoute = publicRoutes.some((r) => pathname.startsWith(r));

  if (!user && !isPublicRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (user && isPublicRoute && pathname !== "/auth/callback") {
    // Redirect logged-in users away from auth pages
    const { data: profile } = await supabase
      .from("profiles")
      .select("role, onboarding_done")
      .eq("id", user.id)
      .single();

    if (!profile) {
      // Profile not yet created — let through to setup
      if (pathname !== "/signup") {
        const url = request.nextUrl.clone();
        url.pathname = "/signup";
        return NextResponse.redirect(url);
      }
      return supabaseResponse;
    }

    const url = request.nextUrl.clone();
    url.pathname = getRoleDashboard(profile.role, profile.onboarding_done);
    return NextResponse.redirect(url);
  }

  // Enforce role-based access to dashboard sub-routes
  if (user && !isPublicRoute) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role, onboarding_done, organisation_id")
      .eq("id", user.id)
      .single();

    if (!profile) {
      const url = request.nextUrl.clone();
      url.pathname = "/signup";
      return NextResponse.redirect(url);
    }

    // Force onboarding for agency_admin who hasn't set up org
    if (
      profile.role === "agency_admin" &&
      !profile.onboarding_done &&
      pathname !== "/agency/onboarding"
    ) {
      const url = request.nextUrl.clone();
      url.pathname = "/agency/onboarding";
      return NextResponse.redirect(url);
    }

    // Block cross-role access
    const rolePrefix = getRolePrefix(profile.role);
    if (rolePrefix && !pathname.startsWith(`/${rolePrefix}`) && pathname !== "/") {
      const roleRoutes = ["/agency", "/creator", "/manager", "/brand"];
      const isOtherRoleRoute = roleRoutes.some(
        (r) => pathname.startsWith(r) && !pathname.startsWith(`/${rolePrefix}`)
      );
      if (isOtherRoleRoute) {
        const url = request.nextUrl.clone();
        url.pathname = getRoleDashboard(profile.role, profile.onboarding_done);
        return NextResponse.redirect(url);
      }
    }
  }

  return supabaseResponse;
}

function getRoleDashboard(role: string, onboardingDone: boolean): string {
  if (role === "agency_admin" && !onboardingDone) return "/agency/onboarding";
  const map: Record<string, string> = {
    agency_admin: "/agency",
    creator: "/creator",
    manager: "/manager",
    brand: "/brand",
  };
  return map[role] ?? "/login";
}

function getRolePrefix(role: string): string {
  const map: Record<string, string> = {
    agency_admin: "agency",
    creator: "creator",
    manager: "manager",
    brand: "brand",
  };
  return map[role] ?? "";
}
