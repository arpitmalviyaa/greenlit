import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("organisation_id, role")
    .eq("id", user.id)
    .single();
  if (!profile?.organisation_id) return NextResponse.json({ error: "No organisation" }, { status: 403 });
  if (profile.role !== "agency_admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json() as {
    crisis_room_id?: string;
    action?: string;
    payload?: Record<string, unknown>;
  };
  const { crisis_room_id, action, payload = {} } = body;
  if (!crisis_room_id || !action) return NextResponse.json({ error: "crisis_room_id and action are required" }, { status: 400 });

  const { data: existing } = await supabase
    .from("crisis_rooms")
    .select("timeline_json, organisation_id")
    .eq("id", crisis_room_id)
    .single();
  if (!existing || existing.organisation_id !== profile.organisation_id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const serviceClient = await createServiceClient();
  let updateData: Record<string, unknown> = {};

  if (action === "add_timeline_entry") {
    const timeline = (existing.timeline_json as unknown[]) ?? [];
    timeline.push({ ...payload, timestamp: new Date().toISOString(), actor: user.id });
    updateData = { timeline_json: timeline };
  } else if (action === "update_status") {
    const validStatuses = ["active", "monitoring", "resolved"];
    if (!payload.status || !validStatuses.includes(payload.status as string)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }
    updateData = { status: payload.status };
  } else if (action === "update_plan") {
    updateData = { action_plan_json: payload };
  } else {
    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  }

  const { data: updated, error } = await serviceClient
    .from("crisis_rooms")
    .update(updateData)
    .eq("id", crisis_room_id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(updated);
}
