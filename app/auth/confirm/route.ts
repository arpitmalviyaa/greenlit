import { NextResponse } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

// Email confirmation endpoint. The confirmation email links here with
// ?type=signup&token_hash={{ .TokenHash }}. Some mail pipelines mangle
// quoted-printable bodies and eat "=" chars at line-wrap boundaries
// (observed in production), so token_hash is extracted defensively from
// the raw query string rather than trusting URLSearchParams alone.
export async function GET(request: Request) {
  const url = new URL(request.url);
  const rawQuery = url.search;

  const type = (url.searchParams.get("type") ??
    rawQuery.match(/type=?(signup|email_change|recovery|invite|magiclink|email)/)?.[1] ??
    "signup") as EmailOtpType;

  const tokenHash =
    url.searchParams.get("token_hash") ??
    // ponytail: tolerate a mangled "token_hash<value>" with the "=" eaten
    rawQuery.match(/token_hash=?([A-Za-z0-9_-]{16,})/)?.[1] ??
    null;

  if (!tokenHash) {
    return NextResponse.redirect(`${url.origin}/login?error=confirm_link_invalid`);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });

  if (error) {
    return NextResponse.redirect(`${url.origin}/login?error=confirm_link_expired`);
  }

  // Password recovery: the session is now live; send the user to set a new password.
  if (type === "recovery") {
    return NextResponse.redirect(`${url.origin}/reset-password`);
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
        agency_admin: profile.onboarding_done ? "/agency" : "/onboarding",
        creator: "/creator",
        manager: "/manager",
        brand: "/brand",
      };
      return NextResponse.redirect(`${url.origin}${destinations[profile.role] ?? "/"}`);
    }
  }

  return NextResponse.redirect(`${url.origin}/login?confirmed=1`);
}
