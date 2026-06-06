import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { getAnthropicClient } from "@/lib/anthropic/client";
import { MODELS } from "@/lib/anthropic/utils";
import { INFRINGEMENT_ANALYSE_SYSTEM, buildInfringementAnalysePrompt } from "@/lib/anthropic/prompts/infringement-analyse";

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase.from("profiles").select("organisation_id").eq("id", user.id).single();
  if (!profile?.organisation_id) return NextResponse.json({ error: "No organisation" }, { status: 403 });

  const body = await req.json() as {
    ip_record_id?: string;
    infringing_url?: string;
    platform?: string;
    infringement_type?: string;
    description?: string;
    jurisdiction?: string;
  };
  const { ip_record_id, infringing_url = "", platform = "other", infringement_type = "copyright", description = "", jurisdiction = "IN" } = body;
  if (!ip_record_id || !infringing_url) {
    return NextResponse.json({ error: "ip_record_id and infringing_url are required" }, { status: 400 });
  }

  const anthropic = getAnthropicClient();
  const msg = await anthropic.messages.create({
    model: MODELS.HAIKU,
    max_tokens: 700,
    system: INFRINGEMENT_ANALYSE_SYSTEM,
    messages: [{
      role: "user",
      content: buildInfringementAnalysePrompt(infringing_url, platform, infringement_type, description, jurisdiction),
    }],
  });
  const raw = msg.content[0].type === "text" ? msg.content[0].text : "{}";
  let result: Record<string, unknown> = { likelihood: "medium", claim_strength: "", evidence_needed: [], recommended_action: "monitor", platform_process: "" };
  try { result = JSON.parse(raw) as Record<string, unknown>; } catch { /* keep default */ }

  const serviceClient = await createServiceClient();
  const { data: record } = await serviceClient.from("infringement_records").insert({
    organisation_id: profile.organisation_id,
    ip_record_id,
    infringing_url,
    platform,
    infringement_type,
    description,
    jurisdiction,
    analysis_json: result,
    created_by: user.id,
  }).select("id").single();

  return NextResponse.json({ ...result, infringement_record_id: record?.id ?? null });
}
