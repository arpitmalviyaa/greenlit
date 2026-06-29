import { NextResponse } from "next/server";
import { internalError } from "@/lib/api/errors";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export async function GET(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase.from("profiles").select("organisation_id").eq("id", user.id).single();
  if (!profile?.organisation_id) return NextResponse.json({ error: "No organisation" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const deal_room_id = searchParams.get("deal_room_id");

  let query = supabase
    .from("scope_change_requests")
    .select("*")
    .eq("organisation_id", profile.organisation_id)
    .order("created_at", { ascending: false });

  if (deal_room_id) query = query.eq("deal_room_id", deal_room_id);

  const { data, error } = await query;
  if (error) return internalError("app/api/scope/change-requests/route.ts", { message: error.message });
  return NextResponse.json({ requests: data ?? [] });
}

export async function PATCH(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase.from("profiles").select("organisation_id, role").eq("id", user.id).single();
  if (!profile?.organisation_id) return NextResponse.json({ error: "No organisation" }, { status: 403 });
  if (profile.role !== "agency_admin") return NextResponse.json({ error: "agency_admin only" }, { status: 403 });

  const body = await req.json() as { request_id: string; status: string };
  if (!body.request_id || !body.status) return NextResponse.json({ error: "request_id and status required" }, { status: 400 });

  const service = await createServiceClient();
  const { data, error } = await service
    .from("scope_change_requests")
    .update({ status: body.status as never, resolved_by: user.id, resolved_at: new Date().toISOString() })
    .eq("id", body.request_id)
    .eq("organisation_id", profile.organisation_id)
    .select("id, status")
    .single();

  if (error) return internalError("app/api/scope/change-requests/route.ts", { message: error.message });
  return NextResponse.json({ request: data });
}
