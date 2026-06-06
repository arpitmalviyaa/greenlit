import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("role, onboarding_done")
          .eq("id", user.id)
          .single();

        if (profile) {
          const destinations: Record<string, string> = {
            agency_admin: profile.onboarding_done ? "/agency" : "/agency/onboarding",
            creator: "/creator",
            manager: "/manager",
            brand: "/brand",
          };
          return NextResponse.redirect(`${origin}${destinations[profile.role] ?? next}`);
        }
      }

      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
}
