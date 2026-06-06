import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

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
  const sow_id = url.searchParams.get("sow_id");
  if (!sow_id) return NextResponse.json({ error: "sow_id is required" }, { status: 400 });

  const { data: events, error } = await supabase
    .from("evidence_timeline")
    .select("*")
    .eq("organisation_id", profile.organisation_id)
    .eq("sow_id", sow_id)
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Fetch actor names separately
  const actorIds = Array.from(new Set((events ?? []).map((e) => e.actor_id).filter(Boolean))) as string[];
  let actorMap: Record<string, string> = {};
  if (actorIds.length > 0) {
    const { data: actors } = await supabase
      .from("profiles")
      .select("id, full_name")
      .in("id", actorIds);
    actorMap = Object.fromEntries((actors ?? []).map((a) => [a.id, a.full_name ?? "Unknown"]));
  }

  const enriched = (events ?? []).map((e) => ({
    ...e,
    actor_name: e.actor_id ? (actorMap[e.actor_id] ?? "Unknown") : "System",
  }));

  return NextResponse.json({ events: enriched });
}
