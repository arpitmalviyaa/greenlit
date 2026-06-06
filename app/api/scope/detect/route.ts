import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase.from("profiles").select("organisation_id").eq("id", user.id).single();
  if (!profile?.organisation_id) return NextResponse.json({ error: "No organisation" }, { status: 403 });

  const body = await req.json() as { sow_id: string };
  if (!body.sow_id) return NextResponse.json({ error: "sow_id required" }, { status: 400 });

  const { data: sow } = await supabase
    .from("sows")
    .select("id, organisation_id, total_value, end_date, sow_json, sow_deliverables(*), sow_payment_milestones(*)")
    .eq("id", body.sow_id)
    .eq("organisation_id", profile.organisation_id)
    .single();

  if (!sow) return NextResponse.json({ error: "SOW not found" }, { status: 404 });

  // Load existing unresolved alerts for idempotency
  const { data: existingAlerts } = await supabase
    .from("scope_alerts")
    .select("alert_type, metadata_json")
    .eq("sow_id", body.sow_id)
    .eq("resolved", false);

  const existingTypes = new Set((existingAlerts ?? []).map((a) => a.alert_type));

  const issues: string[] = [];
  const alertsToInsert: Array<{
    sow_id: string;
    organisation_id: string;
    alert_type: string;
    severity: string;
    message: string;
    metadata_json: object;
  }> = [];

  const today = new Date().toISOString().split("T")[0];

  // Check overdue deliverables
  const deliverables = sow.sow_deliverables as Array<{ id: string; title: string; due_date: string | null; status: string }> ?? [];
  const overdueDeliverables = deliverables.filter(
    (d) => d.due_date && d.due_date < today && d.status !== "approved" && d.status !== "submitted"
  );
  if (overdueDeliverables.length > 0 && !existingTypes.has("deliverable_overdue")) {
    issues.push(`${overdueDeliverables.length} deliverable(s) overdue`);
    alertsToInsert.push({
      sow_id: body.sow_id,
      organisation_id: profile.organisation_id,
      alert_type: "deliverable_overdue",
      severity: "high",
      message: `${overdueDeliverables.length} deliverable(s) are past due date and not yet approved.`,
      metadata_json: { overdue_ids: overdueDeliverables.map((d) => d.id) },
    });
  }

  // Check timeline drift (SOW end date passed)
  if (sow.end_date && sow.end_date < today && !existingTypes.has("timeline_drift")) {
    issues.push("SOW end date has passed");
    alertsToInsert.push({
      sow_id: body.sow_id,
      organisation_id: profile.organisation_id,
      alert_type: "timeline_drift",
      severity: "medium",
      message: `SOW end date (${sow.end_date}) has passed without closure.`,
      metadata_json: { end_date: sow.end_date },
    });
  }

  // Check unapproved deliverable count vs baseline in sow_json
  const sowJson = sow.sow_json as { deliverables?: unknown[] } | null;
  const baselineCount = sowJson?.deliverables?.length ?? 0;
  const actualCount = deliverables.length;
  if (actualCount > baselineCount && !existingTypes.has("unapproved_change")) {
    issues.push(`${actualCount - baselineCount} deliverable(s) added beyond SOW baseline`);
    alertsToInsert.push({
      sow_id: body.sow_id,
      organisation_id: profile.organisation_id,
      alert_type: "unapproved_change",
      severity: "medium",
      message: `${actualCount - baselineCount} deliverable(s) added beyond the original SOW scope.`,
      metadata_json: { baseline: baselineCount, actual: actualCount },
    });
  }

  if (alertsToInsert.length > 0) {
    const service = await createServiceClient();
    await service.from("scope_alerts").insert(alertsToInsert as never);
  }

  return NextResponse.json({ alerts_created: alertsToInsert.length, issues });
}
