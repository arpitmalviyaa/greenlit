import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { getAnthropicClient } from "@/lib/anthropic/client";
import { MODELS } from "@/lib/anthropic/utils";
import { CRISIS_PLAN_SYSTEM, buildCrisisPlanPrompt } from "@/lib/anthropic/prompts/crisis-plan";

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
  if (profile.role !== "agency_admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json() as {
    title?: string;
    severity?: string;
    legal_notice_id?: string;
    jurisdiction?: string;
  };
  const title = (body.title ?? "Crisis").trim();
  const severity = (body.severity ?? "high") as "critical" | "high" | "medium" | "low";
  const legal_notice_id = body.legal_notice_id;
  const jurisdiction = body.jurisdiction ?? "IN";

  let noticeContext = "";
  if (legal_notice_id) {
    const { data: notice } = await supabase
      .from("legal_notices")
      .select("notice_text, triage_json")
      .eq("id", legal_notice_id)
      .single();
    if (notice) {
      noticeContext = notice.notice_text?.slice(0, 1000) ?? "";
    }
  }

  let action_plan_json: Record<string, unknown> | null = null;
  try {
    const anthropic = getAnthropicClient();
    const msg = await anthropic.messages.create({
      model: MODELS.HAIKU,
      max_tokens: 800,
      system: CRISIS_PLAN_SYSTEM,
      messages: [{ role: "user", content: buildCrisisPlanPrompt(title, severity, noticeContext, jurisdiction) }],
    });
    const raw = msg.content[0].type === "text" ? msg.content[0].text : "{}";
    action_plan_json = JSON.parse(raw) as Record<string, unknown>;
  } catch { /* proceed without plan */ }

  const serviceClient = await createServiceClient();
  const { data: room, error } = await serviceClient.from("crisis_rooms").insert({
    organisation_id: profile.organisation_id,
    legal_notice_id: legal_notice_id ?? null,
    title,
    severity,
    status: "active",
    jurisdiction,
    timeline_json: [],
    action_plan_json,
    created_by: user.id,
  }).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(room);
}
