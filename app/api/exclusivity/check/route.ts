import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("organisation_id")
    .eq("id", user.id)
    .single();
  if (!profile?.organisation_id) return NextResponse.json({ error: "No organisation" }, { status: 403 });

  const body = await req.json() as {
    creator_id: string;
    brand_name: string;
    category: string;
    start_date: string;
    end_date: string;
    jurisdiction?: string;
  };

  if (!body.creator_id || !body.brand_name || !body.category || !body.start_date || !body.end_date) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  // Find overlapping exclusivity records for this creator
  const { data: conflicts } = await supabase
    .from("exclusivity_records")
    .select("*")
    .eq("creator_id", body.creator_id)
    .eq("category", body.category)
    .lte("start_date", body.end_date)
    .gte("end_date", body.start_date);

  const hasConflict = (conflicts?.length ?? 0) > 0;

  let alertId: string | undefined;
  if (hasConflict && conflicts && conflicts.length > 0) {
    const service = await createServiceClient();
    const { data: alert } = await service
      .from("exclusivity_alerts")
      .insert({
        organisation_id: profile.organisation_id,
        creator_id: body.creator_id,
        conflicting_sow_id: null,
        existing_record_id: conflicts[0].id,
        alert_message: `Exclusivity conflict: creator already has ${body.category} exclusivity with ${conflicts[0].brand_name} from ${conflicts[0].start_date} to ${conflicts[0].end_date}`,
        severity: "high",
      })
      .select("id")
      .single();
    alertId = alert?.id;
  }

  return NextResponse.json({
    conflict: hasConflict,
    conflicts: conflicts ?? [],
    alert_id: alertId ?? null,
  });
}
