import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export async function GET(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("organisation_id")
    .eq("id", user.id)
    .single();
  if (!profile?.organisation_id) return NextResponse.json({ error: "No organisation" }, { status: 403 });

  const url = new URL(req.url);
  const category = url.searchParams.get("category");
  const jurisdiction = url.searchParams.get("jurisdiction");

  const serviceClient = await createServiceClient();
  let query = serviceClient
    .from("claims")
    .select(`
      id, claim_text, category, jurisdiction, verdict, risk_score, created_at, updated_at,
      claim_evidence(count),
      claim_audit_log(action, created_at)
    `)
    .eq("organisation_id", profile.organisation_id)
    .order("created_at", { ascending: false });

  if (category) query = query.eq("category", category);
  if (jurisdiction) query = query.eq("jurisdiction", jurisdiction);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(data ?? []);
}
