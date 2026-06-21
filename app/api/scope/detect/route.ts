import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase.from("profiles").select("organisation_id").eq("id", user.id).single();
  if (!profile?.organisation_id) return NextResponse.json({ error: "No organisation" }, { status: 403 });

  const body = await req.json() as { deal_room_id?: string };
  if (!body.deal_room_id) return NextResponse.json({ error: "deal_room_id required" }, { status: 400 });

  const { data: room } = await supabase
    .from("deal_rooms")
    .select("id")
    .eq("id", body.deal_room_id)
    .eq("organisation_id", profile.organisation_id)
    .single();
  if (!room) return NextResponse.json({ error: "Deal room not found" }, { status: 404 });

  const { data: proposals, error: proposalsError } = await supabase
    .from("deal_messages")
    .select("id, message_type, term_json, created_at")
    .eq("deal_room_id", body.deal_room_id)
    .in("message_type", ["term_proposal", "counter_proposal"])
    .not("term_json", "is", null)
    .order("created_at", { ascending: false })
    .limit(2);

  if (proposalsError) return NextResponse.json({ error: proposalsError.message }, { status: 500 });
  if (!proposals || proposals.length < 2) {
    return NextResponse.json({ alerts_created: 0, issues: [] });
  }

  const current = proposals[0].term_json as Record<string, unknown>;
  const previous = proposals[1].term_json as Record<string, unknown>;
  const changedTerms = [...new Set([...Object.keys(previous), ...Object.keys(current)])]
    .filter((key) => JSON.stringify(previous[key]) !== JSON.stringify(current[key]));

  if (changedTerms.length === 0) {
    return NextResponse.json({ alerts_created: 0, issues: [] });
  }

  const { data: existing } = await supabase
    .from("scope_alerts")
    .select("id")
    .eq("deal_room_id", body.deal_room_id)
    .eq("alert_type", "unapproved_change")
    .eq("resolved", false)
    .contains("metadata_json", { current_message_id: proposals[0].id })
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ alerts_created: 0, issues: [`Changed terms: ${changedTerms.join(", ")}`] });
  }

  const service = await createServiceClient();
  const { error: insertError } = await service.from("scope_alerts").insert({
    deal_room_id: body.deal_room_id,
    organisation_id: profile.organisation_id,
    alert_type: "unapproved_change",
    severity: "medium",
    message: `Negotiated terms changed: ${changedTerms.join(", ")}.`,
    metadata_json: {
      changed_terms: changedTerms,
      previous_message_id: proposals[1].id,
      current_message_id: proposals[0].id,
    },
  });

  if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 });
  return NextResponse.json({ alerts_created: 1, issues: [`Changed terms: ${changedTerms.join(", ")}`] });
}
