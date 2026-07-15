import { NextResponse } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import { publicSupabaseEnv } from "@/lib/env";

// This route handles Supabase email confirmation links.
// Supabase appends ?code=... when the user clicks the confirmation link.
// We exchange the code for a session, then redirect to onboarding.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
  }

  const cookieStore = await cookies();
  const env = publicSupabaseEnv();

  const supabase = createServerClient(
    env.url,
    env.anonKey,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Ignore: called from Server Component context
          }
        },
      },
    }
  );

  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
  }

  // Route by profile: onboarded users go to their dashboard, new users (incl.
  // first-time OAuth sign-ins) go to workspace setup.
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role, onboarding_done")
      .eq("id", user.id)
      .single();
    if (profile?.onboarding_done) {
      const destinations: Record<string, string> = {
        agency_admin: "/agency",
        creator: "/creator",
        manager: "/manager",
        brand: "/brand",
      };
      return NextResponse.redirect(`${origin}${destinations[profile.role] ?? "/"}`);
    }
  }
  return NextResponse.redirect(`${origin}/onboarding`);
}
