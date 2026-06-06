import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase.from("profiles").select("organisation_id, role").eq("id", user.id).single();
  if (!profile?.organisation_id) return NextResponse.json({ error: "No organisation" }, { status: 403 });
  if (profile.role !== "agency_admin") return NextResponse.json({ error: "agency_admin only" }, { status: 403 });

  const body = await req.json() as { sow_id: string };
  if (!body.sow_id) return NextResponse.json({ error: "sow_id required" }, { status: 400 });

  const { sow_id } = body;
  const service = await createServiceClient();

  // Return existing lock if present (idempotent)
  const { data: existingLock } = await service
    .from("delivery_locks")
    .select("*")
    .eq("sow_id", sow_id)
    .single();

  // Check deliverables
  const { data: deliverables } = await supabase
    .from("sow_deliverables")
    .select("id, title, status")
    .eq("sow_id", sow_id);

  const { data: milestones } = await supabase
    .from("sow_payment_milestones")
    .select("id, title, status")
    .eq("sow_id", sow_id);

  const allDeliverables = deliverables ?? [];
  const allMilestones = milestones ?? [];

  const allDelivApproved = allDeliverables.length > 0 && allDeliverables.every((d) => d.status === "approved");
  const allMilesPaid = allMilestones.length > 0 && allMilestones.every((m) => m.status === "paid");

  const checklist = {
    deliverables: {
      total: allDeliverables.length,
      approved: allDeliverables.filter((d) => d.status === "approved").length,
      all_approved: allDelivApproved,
    },
    milestones: {
      total: allMilestones.length,
      paid: allMilestones.filter((m) => m.status === "paid").length,
      all_paid: allMilesPaid,
    },
  };

  const lockStatus = allDelivApproved && allMilesPaid ? "complete" : "pending";

  if (existingLock) {
    // Recheck and update
    const { data: updated } = await service
      .from("delivery_locks")
      .update({
        checklist_json: checklist as never,
        all_deliverables_approved: allDelivApproved,
        all_milestones_paid: allMilesPaid,
        lock_status: lockStatus,
      })
      .eq("sow_id", sow_id)
      .select("*")
      .single();

    if (lockStatus === "complete") {
      await service.from("sows").update({ status: "signed" }).eq("id", sow_id);
    }
    return NextResponse.json({ lock: updated, checklist });
  }

  // Create new lock
  const { data: lock, error } = await service
    .from("delivery_locks")
    .insert({
      sow_id,
      organisation_id: profile.organisation_id,
      locked_by: user.id,
      checklist_json: checklist as never,
      all_deliverables_approved: allDelivApproved,
      all_milestones_paid: allMilesPaid,
      lock_status: lockStatus,
    })
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (lockStatus === "complete") {
    await service.from("sows").update({ status: "signed" }).eq("id", sow_id);
  }

  return NextResponse.json({ lock, checklist });
}
