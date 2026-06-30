import { NextResponse } from "next/server";
import { internalError } from "@/lib/api/errors";
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
  if (profile.role !== "agency_admin") return NextResponse.json({ error: "agency_admin only" }, { status: 403 });

  const body = await req.json() as { contract_id?: string; assigned_to?: string };
  if (!body.contract_id) return NextResponse.json({ error: "contract_id required" }, { status: 400 });

  const { data: contract } = await supabase
    .from("contracts")
    .select("id, title, status, analysis_json")
    .eq("id", body.contract_id)
    .eq("organisation_id", profile.organisation_id)
    .single();
  if (!contract) return NextResponse.json({ error: "Contract not found" }, { status: 404 });
  if (!contract.analysis_json) return NextResponse.json({ error: "Contract Review must be completed first" }, { status: 409 });
  if (!["reviewed", "negotiated"].includes(contract.status)) {
    return NextResponse.json({ error: `Cannot start final check from ${contract.status}` }, { status: 409 });
  }

  const service = await createServiceClient();
  const transitioned = contract.status === "reviewed";
  if (contract.status === "reviewed") {
    const { error } = await service
      .from("contracts")
      .update({ status: "negotiated" })
      .eq("id", contract.id)
      .eq("organisation_id", profile.organisation_id);
    if (error) return internalError("app/api/final-check/start/route.ts", { message: error.message });
  }

  let createdLock = false;
  let { data: lock } = await service
    .from("delivery_locks")
    .select("*")
    .eq("contract_id", contract.id)
    .maybeSingle();

  if (!lock) {
    const { data, error } = await service
      .from("delivery_locks")
      .insert({
        contract_id: contract.id,
        organisation_id: profile.organisation_id,
        locked_by: user.id,
        checklist_json: {},
        lock_status: "pending",
      })
      .select("*")
      .single();
    if (error) {
      if (transitioned) await service.from("contracts").update({ status: "reviewed" }).eq("id", contract.id);
      return internalError("app/api/final-check/start/route.ts", { message: error.message });
    }
    lock = data;
    createdLock = true;
  }

  let { data: approval } = await service
    .from("approval_requests")
    .select("*")
    .eq("contract_id", contract.id)
    .eq("status", "pending")
    .limit(1)
    .maybeSingle();

  if (!approval) {
    const { data, error } = await service
      .from("approval_requests")
      .insert({
        organisation_id: profile.organisation_id,
        contract_id: contract.id,
        submitted_by: user.id,
        assigned_to: body.assigned_to ?? user.id,
        title: `Final Contract Check — ${contract.title}`,
        description: "Review the negotiated contract before it is cleared for signature.",
        status: "pending",
      })
      .select("*")
      .single();
    if (error) {
      if (createdLock) await service.from("delivery_locks").delete().eq("id", lock.id);
      if (transitioned) await service.from("contracts").update({ status: "reviewed" }).eq("id", contract.id);
      return internalError("app/api/final-check/start/route.ts", { message: error.message });
    }
    approval = data;
  }

  return NextResponse.json({ contract_status: "negotiated", lock, approval });
}
