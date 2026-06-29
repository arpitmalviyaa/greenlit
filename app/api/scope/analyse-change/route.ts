import { NextResponse } from "next/server";
import { internalError } from "@/lib/api/errors";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { getAnthropicClient } from "@/lib/anthropic/client";
import { MODELS } from "@/lib/anthropic/utils";
import { SCOPE_CHANGE_SYSTEM, scopeChangeUser } from "@/lib/anthropic/prompts/scope-change-analyse";

function safeParse<T>(text: string): T | null {
  try { return JSON.parse(text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim()) as T; }
  catch { return null; }
}

interface AnalyseChangeBody {
  deal_room_id: string;
  change_type: string;
  description: string;
  original_value: object;
  proposed_value: object;
  jurisdiction: string;
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase.from("profiles").select("organisation_id").eq("id", user.id).single();
  if (!profile?.organisation_id) return NextResponse.json({ error: "No organisation" }, { status: 403 });

  const body = await req.json() as AnalyseChangeBody;
  const { deal_room_id, change_type, description, original_value, proposed_value, jurisdiction = "IN" } = body;
  if (!deal_room_id || !change_type || !description) return NextResponse.json({ error: "Missing fields" }, { status: 400 });

  const { data: room } = await supabase
    .from("deal_rooms")
    .select("id")
    .eq("id", deal_room_id)
    .eq("organisation_id", profile.organisation_id)
    .single();
  if (!room) return NextResponse.json({ error: "Deal room not found" }, { status: 404 });

  const ai = getAnthropicClient();
  const res = await ai.messages.create({
    model: MODELS.HAIKU,
    max_tokens: 700,
    system: SCOPE_CHANGE_SYSTEM,
    messages: [{ role: "user", content: scopeChangeUser({ change_type, description, original_value: original_value ?? {}, proposed_value: proposed_value ?? {}, jurisdiction }) }],
  });

  const impact = safeParse<{
    financial_impact: string; timeline_impact: string;
    legal_risk: string; recommendation: string;
    reasoning: string; suggested_compensation: string;
  }>(res.content[0].type === "text" ? res.content[0].text : "{}") ?? {
    financial_impact: "", timeline_impact: "", legal_risk: "medium",
    recommendation: "negotiate", reasoning: "", suggested_compensation: "",
  };

  const service = await createServiceClient();
  const { data, error } = await service
    .from("scope_change_requests")
    .insert({
      deal_room_id,
      organisation_id: profile.organisation_id,
      requested_by: user.id,
      change_type: change_type as never,
      description,
      original_value: (original_value ?? {}) as never,
      proposed_value: (proposed_value ?? {}) as never,
      impact_analysis_json: impact as never,
      status: "pending",
    })
    .select("id")
    .single();

  if (error) return internalError("app/api/scope/analyse-change/route.ts", { message: error.message });
  return NextResponse.json({ request_id: data.id, impact });
}
