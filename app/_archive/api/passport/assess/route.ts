import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { getAnthropicClient } from "@/lib/anthropic/client";
import { MODELS } from "@/lib/anthropic/utils";
import { PASSPORT_ASSESS_SYSTEM, buildPassportAssessPrompt } from "@/lib/anthropic/prompts/passport-assess";

interface PassportResult {
  compliance_score: number;
  checklist_json: Array<{ item: string; passed: boolean; notes: string }>;
  risk_flags: string[];
  status: "clear" | "flagged" | "suspended";
}

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

  const body = await req.json() as { creator_id: string; jurisdiction?: string };
  if (!body.creator_id) return NextResponse.json({ error: "creator_id required" }, { status: 400 });

  const jurisdiction = body.jurisdiction ?? "IN";

  // Resolve this creator's SOW ids first — supabase-js `.in()` takes a value
  // array, not a query builder, so the subquery must be run separately.
  const { data: creatorSows } = await supabase
    .from("sows")
    .select("id")
    .eq("creator_id", body.creator_id);
  const creatorSowIds = (creatorSows ?? []).map((s) => s.id);

  // Gather context from existing tables
  const [deliverablesRes, alertsRes, approvalsRes, scopeRes, claimsRes] = await Promise.allSettled([
    supabase.from("sow_deliverables")
      .select("status")
      .in("sow_id", creatorSowIds),
    supabase.from("exclusivity_alerts")
      .select("id")
      .eq("creator_id", body.creator_id)
      .eq("resolved", false),
    supabase.from("approval_requests")
      .select("status")
      .eq("organisation_id", profile.organisation_id),
    supabase.from("scope_change_requests")
      .select("status")
      .eq("organisation_id", profile.organisation_id),
    supabase.from("claims")
      .select("verdict")
      .eq("organisation_id", profile.organisation_id),
  ]);

  const deliverables = deliverablesRes.status === "fulfilled" ? (deliverablesRes.value.data ?? []) : [];
  const exclusivityAlerts = alertsRes.status === "fulfilled" ? (alertsRes.value.data ?? []) : [];
  const approvals = approvalsRes.status === "fulfilled" ? (approvalsRes.value.data ?? []) : [];
  const scopeChanges = scopeRes.status === "fulfilled" ? (scopeRes.value.data ?? []) : [];
  const claims = claimsRes.status === "fulfilled" ? (claimsRes.value.data ?? []) : [];

  const stats = {
    deliverables_total: deliverables.length,
    deliverables_approved: deliverables.filter((d: { status: string }) => d.status === "approved").length,
    deliverables_rejected: deliverables.filter((d: { status: string }) => d.status === "rejected").length,
    exclusivity_alerts: exclusivityAlerts.length,
    pending_approvals: approvals.filter((a: { status: string }) => a.status === "pending").length,
    scope_changes: scopeChanges.length,
    claims_substantiated: claims.filter((c: { verdict: string }) => c.verdict === "substantiated").length,
    claims_unsubstantiated: claims.filter((c: { verdict: string }) => c.verdict === "unsubstantiated" || c.verdict === "misleading").length,
  };

  const anthropic = getAnthropicClient();
  const msg = await anthropic.messages.create({
    model: MODELS.HAIKU,
    max_tokens: 800,
    system: PASSPORT_ASSESS_SYSTEM,
    messages: [{ role: "user", content: buildPassportAssessPrompt(body.creator_id, jurisdiction, stats) }],
  });

  const raw = msg.content[0].type === "text" ? msg.content[0].text : "{}";
  let result: PassportResult = { compliance_score: 50, checklist_json: [], risk_flags: [], status: "flagged" };
  try { result = JSON.parse(raw) as PassportResult; } catch { /* keep default */ }

  const service = await createServiceClient();
  const { data: passport } = await service
    .from("safety_passports")
    .upsert({
      organisation_id: profile.organisation_id,
      creator_id: body.creator_id,
      jurisdiction,
      compliance_score: Math.min(100, Math.max(0, result.compliance_score)),
      last_assessed_at: new Date().toISOString(),
      checklist_json: result.checklist_json as unknown as Record<string, unknown>[],
      risk_flags: result.risk_flags,
      status: result.status,
    }, { onConflict: "organisation_id,creator_id" })
    .select()
    .single();

  return NextResponse.json({ passport });
}
