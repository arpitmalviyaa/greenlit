import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase.from("profiles").select("organisation_id, role").eq("id", user.id).single();
  if (!profile?.organisation_id) return NextResponse.json({ error: "No organisation" }, { status: 403 });
  if (profile.role !== "agency_admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json() as { jurisdiction_code?: string };
  const jur = (body.jurisdiction_code ?? "").toUpperCase();
  if (!jur) return NextResponse.json({ error: "jurisdiction_code is required" }, { status: 400 });

  // Get plan jurisdiction limit
  const { data: sub } = await supabase
    .from("organisation_subscriptions")
    .select("plan_id")
    .eq("organisation_id", profile.organisation_id)
    .maybeSingle();

  let jurisdictionLimit = 1;
  if (sub?.plan_id) {
    const { data: plan } = await supabase
      .from("subscription_plans")
      .select("jurisdiction_limit")
      .eq("id", sub.plan_id)
      .single();
    jurisdictionLimit = plan?.jurisdiction_limit ?? 1;
  }

  // Count current active jurisdictions
  const { count } = await supabase
    .from("organisation_jurisdictions")
    .select("id", { count: "exact", head: true })
    .eq("organisation_id", profile.organisation_id);

  if ((count ?? 0) >= jurisdictionLimit) {
    return NextResponse.json({
      error: "Jurisdiction limit reached for your plan",
      upgrade_required: true,
      current_count: count,
      limit: jurisdictionLimit,
    }, { status: 402 });
  }

  const serviceClient = await createServiceClient();
  const { error } = await serviceClient.from("organisation_jurisdictions").insert({
    organisation_id: profile.organisation_id,
    jurisdiction_code: jur,
  });

  if (error && !error.message.includes("duplicate")) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await serviceClient.from("billing_events").insert({
    organisation_id: profile.organisation_id,
    event_type: "jurisdiction_added",
    metadata_json: { jurisdiction_code: jur },
  });

  const { data: jurisdictions } = await supabase
    .from("organisation_jurisdictions")
    .select("jurisdiction_code")
    .eq("organisation_id", profile.organisation_id);

  return NextResponse.json({ active_jurisdictions: (jurisdictions ?? []).map((j) => j.jurisdiction_code) });
}
