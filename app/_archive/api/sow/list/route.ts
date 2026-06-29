import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase.from("profiles").select("organisation_id").eq("id", user.id).single();
  if (!profile?.organisation_id) return NextResponse.json({ error: "No organisation" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const campaign_id = searchParams.get("campaign_id");

  let query = supabase
    .from("sows")
    .select(`
      id, title, brand_name, status, total_value, currency,
      start_date, end_date, jurisdiction, created_at,
      sow_deliverables(count),
      sow_payment_milestones(count)
    `)
    .eq("organisation_id", profile.organisation_id)
    .order("created_at", { ascending: false });

  if (status) query = query.eq("status", status);
  if (campaign_id) query = query.eq("campaign_id", campaign_id);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ sows: data ?? [] });
}
