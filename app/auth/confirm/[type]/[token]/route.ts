import { NextResponse } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

// Path-based email confirmation: /auth/confirm/<type>/<token_hash>.
// Query-string links get corrupted in transit: the emails travel as
// quoted-printable with unescaped "=", so "=58" (hex) decodes as a QP byte
// and eats part of the token. A path has no "=" — immune by construction.
const TYPES = new Set(["signup", "email_change", "recovery", "invite", "magiclink", "email"]);

export async function GET(
  request: Request,
  { params }: { params: Promise<{ type: string; token: string }> }
) {
  const { type, token } = await params;
  const origin = new URL(request.url).origin;

  if (!TYPES.has(type) || !/^[A-Za-z0-9_-]{16,}$/.test(token)) {
    return NextResponse.redirect(`${origin}/login?error=confirm_link_invalid`);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({ type: type as EmailOtpType, token_hash: token });
  if (error) {
    return NextResponse.redirect(`${origin}/login?error=confirm_link_expired`);
  }

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
      return NextResponse.redirect(`${origin}${destinations[profile.role] ?? "/"}`);
    }
  }
  return NextResponse.redirect(`${origin}/login?confirmed=1`);
}
