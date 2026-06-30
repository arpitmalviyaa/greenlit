import { NextResponse } from "next/server";
import { internalError } from "@/lib/api/errors";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase.from("profiles").select("organisation_id, role").eq("id", user.id).single();
  if (!profile?.organisation_id) return NextResponse.json({ error: "No organisation" }, { status: 403 });
  if (profile.role !== "agency_admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json() as Record<string, unknown>;
  const allowed = ["title", "category", "content", "jurisdiction", "tags"];
  const updates: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in body) updates[key] = body[key];
  }

  const serviceClient = await createServiceClient();
  const { data, error } = await serviceClient.from("playbook_entries")
    .update(updates)
    .eq("id", id)
    .eq("organisation_id", profile.organisation_id)
    .select()
    .single();

  if (error) return internalError("app/api/playbook/entries/[id]/route.ts", { message: error.message });
  return NextResponse.json(data);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase.from("profiles").select("organisation_id, role").eq("id", user.id).single();
  if (!profile?.organisation_id) return NextResponse.json({ error: "No organisation" }, { status: 403 });
  if (profile.role !== "agency_admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const serviceClient = await createServiceClient();
  await serviceClient.from("playbook_entries").delete().eq("id", id).eq("organisation_id", profile.organisation_id);
  return NextResponse.json({ success: true });
}
