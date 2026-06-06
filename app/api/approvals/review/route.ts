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
  if (!["agency_admin", "brand"].includes(profile.role)) {
    return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
  }

  const body = await req.json() as {
    approval_id: string;
    status: "approved" | "rejected" | "revision_requested";
    feedback?: string;
  };

  if (!body.approval_id || !body.status) {
    return NextResponse.json({ error: "approval_id and status are required" }, { status: 400 });
  }

  const service = await createServiceClient();

  // Fetch existing approval
  const { data: existing } = await service
    .from("approval_requests")
    .select("deliverable_id")
    .eq("id", body.approval_id)
    .single();

  const updatePayload: Record<string, unknown> = {
    status: body.status,
    feedback: body.feedback ?? null,
    updated_at: new Date().toISOString(),
    assigned_to: user.id,
  };
  if (body.status === "approved") {
    updatePayload.resolved_at = new Date().toISOString();
  }

  const { data: updated, error } = await service
    .from("approval_requests")
    .update(updatePayload)
    .eq("id", body.approval_id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // If approved and deliverable exists, update deliverable status
  if (body.status === "approved" && existing?.deliverable_id) {
    await service
      .from("sow_deliverables")
      .update({ status: "approved" })
      .eq("id", existing.deliverable_id);
  }

  return NextResponse.json({ approval: updated });
}
