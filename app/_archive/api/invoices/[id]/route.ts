import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

const VALID_TRANSITIONS: Record<string, string[]> = {
  draft: ["sent", "cancelled"],
  sent: ["paid", "overdue", "cancelled"],
  overdue: ["paid", "cancelled"],
  paid: [],
  cancelled: [],
};

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase.from("profiles").select("organisation_id").eq("id", user.id).single();
  if (!profile?.organisation_id) return NextResponse.json({ error: "No organisation" }, { status: 403 });

  const { data, error } = await supabase
    .from("invoices")
    .select("*")
    .eq("id", id)
    .eq("organisation_id", profile.organisation_id)
    .single();

  if (error || !data) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ invoice: data });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase.from("profiles").select("organisation_id, role").eq("id", user.id).single();
  if (!profile?.organisation_id) return NextResponse.json({ error: "No organisation" }, { status: 403 });
  if (profile.role !== "agency_admin") return NextResponse.json({ error: "agency_admin only" }, { status: 403 });

  const body = await req.json() as { status: string };
  if (!body.status) return NextResponse.json({ error: "status required" }, { status: 400 });

  const { data: existing } = await supabase.from("invoices").select("status").eq("id", id).eq("organisation_id", profile.organisation_id).single();
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const allowed = VALID_TRANSITIONS[existing.status] ?? [];
  if (!allowed.includes(body.status)) {
    return NextResponse.json({ error: `Cannot transition from ${existing.status} to ${body.status}` }, { status: 400 });
  }

  const updates: Record<string, unknown> = { status: body.status };
  if (body.status === "paid") updates.paid_at = new Date().toISOString();

  const service = await createServiceClient();
  const { data, error } = await service.from("invoices").update(updates).eq("id", id).select("id, status, paid_at").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ invoice: data });
}
