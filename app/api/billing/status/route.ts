import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase.from("profiles").select("organisation_id").eq("id", user.id).single();
  if (!profile?.organisation_id) return NextResponse.json({ error: "No organisation" }, { status: 403 });

  const { data: sub } = await supabase
    .from("organisation_subscriptions")
    .select("*, subscription_plans(*)")
    .eq("organisation_id", profile.organisation_id)
    .maybeSingle();

  const { data: jurisdictions } = await supabase
    .from("organisation_jurisdictions")
    .select("jurisdiction_code")
    .eq("organisation_id", profile.organisation_id);

  return NextResponse.json({
    subscription: sub,
    active_jurisdictions: (jurisdictions ?? []).map((j) => j.jurisdiction_code),
  });
}
