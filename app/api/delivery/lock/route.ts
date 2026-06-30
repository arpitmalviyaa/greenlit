import { NextResponse } from "next/server";
import { internalError } from "@/lib/api/errors";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase.from("profiles").select("organisation_id, role").eq("id", user.id).single();
  if (!profile?.organisation_id) return NextResponse.json({ error: "No organisation" }, { status: 403 });
  if (profile.role !== "agency_admin") return NextResponse.json({ error: "agency_admin only" }, { status: 403 });

  const body = await req.json() as { sow_id?: string; contract_id?: string };
  if (!body.sow_id && !body.contract_id) {
    return NextResponse.json({ error: "sow_id or contract_id required" }, { status: 400 });
  }
  if (body.sow_id && body.contract_id) {
    return NextResponse.json({ error: "Choose either sow_id or contract_id" }, { status: 400 });
  }

  const service = await createServiceClient();

  if (body.contract_id) {
    const { data: contract } = await supabase
      .from("contracts")
      .select("id, status, analysis_json")
      .eq("id", body.contract_id)
      .eq("organisation_id", profile.organisation_id)
      .single();
    if (!contract) return NextResponse.json({ error: "Contract not found" }, { status: 404 });
    if (!["negotiated", "approved"].includes(contract.status)) {
      return NextResponse.json({ error: "Final Contract Check has not been started" }, { status: 409 });
    }

    const { data: rooms } = await supabase
      .from("deal_rooms")
      .select("id")
      .eq("contract_id", contract.id)
      .eq("organisation_id", profile.organisation_id);
    const roomIds = (rooms ?? []).map((room) => room.id);

    let unresolvedScopeAlerts = 0;
    if (roomIds.length > 0) {
      const { count } = await supabase
        .from("scope_alerts")
        .select("id", { count: "exact", head: true })
        .in("deal_room_id", roomIds)
        .eq("resolved", false);
      unresolvedScopeAlerts = count ?? 0;
    }

    const { data: approvals } = await supabase
      .from("approval_requests")
      .select("id, status")
      .eq("contract_id", contract.id)
      .eq("organisation_id", profile.organisation_id);

    const contractApprovals = approvals ?? [];
    const checklist = {
      contract_review: { complete: !!contract.analysis_json },
      negotiation: { complete: ["negotiated", "approved"].includes(contract.status) },
      scope: { complete: unresolvedScopeAlerts === 0, unresolved_alerts: unresolvedScopeAlerts },
      approvals: {
        complete: contractApprovals.length > 0 && contractApprovals.every((approval) => approval.status === "approved"),
        total: contractApprovals.length,
        approved: contractApprovals.filter((approval) => approval.status === "approved").length,
      },
    };
    const lockStatus = Object.values(checklist).every((item) => item.complete) ? "complete" : "pending";

    const { data: existingLock } = await service
      .from("delivery_locks")
      .select("*")
      .eq("contract_id", contract.id)
      .maybeSingle();

    let lock;
    if (existingLock) {
      const { data, error } = await service
        .from("delivery_locks")
        .update({ checklist_json: checklist, lock_status: lockStatus })
        .eq("id", existingLock.id)
        .eq("organisation_id", profile.organisation_id)
        .select("*")
        .single();
      if (error) return internalError("app/api/delivery/lock/route.ts", { message: error.message });
      lock = data;
    } else {
      const { data, error } = await service
        .from("delivery_locks")
        .insert({
          contract_id: contract.id,
          organisation_id: profile.organisation_id,
          locked_by: user.id,
          checklist_json: checklist,
          lock_status: lockStatus,
        })
        .select("*")
        .single();
      if (error) return internalError("app/api/delivery/lock/route.ts", { message: error.message });
      lock = data;
    }

    if (lockStatus === "complete" && contract.status !== "approved") {
      const { error } = await service
        .from("contracts")
        .update({ status: "approved" })
        .eq("id", contract.id)
        .eq("organisation_id", profile.organisation_id);
      if (error) return internalError("app/api/delivery/lock/route.ts", { message: error.message });
    }

    return NextResponse.json({ lock, checklist, contract_status: lockStatus === "complete" ? "approved" : contract.status });
  }

  const sow_id = body.sow_id!;

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

  if (error) return internalError("app/api/delivery/lock/route.ts", { message: error.message });

  if (lockStatus === "complete") {
    await service.from("sows").update({ status: "signed" }).eq("id", sow_id);
  }

  return NextResponse.json({ lock, checklist });
}
