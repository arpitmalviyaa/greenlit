import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export async function GET(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase.from("profiles").select("organisation_id").eq("id", user.id).single();
  if (!profile?.organisation_id) return NextResponse.json({ error: "No organisation" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const infringement_record_id = searchParams.get("infringement_record_id");

  let query = supabase
    .from("takedown_notices")
    .select("id, platform, notice_type, status, sent_at, created_at")
    .eq("organisation_id", profile.organisation_id)
    .order("created_at", { ascending: false });

  if (infringement_record_id) query = query.eq("infringement_record_id", infringement_record_id);

  const { data } = await query;
  return NextResponse.json(data ?? []);
}

export async function PATCH(req: Request) {
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

  const body = await req.json() as { takedown_id?: string; status?: string };
  const validStatuses = ["draft", "sent", "acknowledged", "complied", "disputed"];
  if (!body.takedown_id || !body.status || !validStatuses.includes(body.status)) {
    return NextResponse.json({ error: "takedown_id and valid status are required" }, { status: 400 });
  }

  const serviceClient = await createServiceClient();
  const updateData: Record<string, unknown> = {
    status: body.status,
  };
  if (body.status === "sent") updateData.sent_at = new Date().toISOString();

  const { data, error } = await serviceClient.from("takedown_notices")
    .update(updateData)
    .eq("id", body.takedown_id)
    .eq("organisation_id", profile.organisation_id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
