import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { getAnthropicClient } from "@/lib/anthropic/client";
import { MODELS } from "@/lib/anthropic/utils";
import { ADVERSARY_LENS_SYSTEM, buildAdversaryLensPrompt } from "@/lib/anthropic/prompts/adversary-lens";
import { getRelevantCorpus, formatCorpusForPrompt } from "@/lib/corpus/index";
import { checkPlanAccess } from "@/lib/utils/plan-gate";

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase.from("profiles").select("organisation_id").eq("id", user.id).single();
  if (!profile?.organisation_id) return NextResponse.json({ error: "No organisation" }, { status: 403 });

  const { allowed, minimum_plan } = await checkPlanAccess(profile.organisation_id, "adversary_lens");
  if (!allowed) return NextResponse.json({ error: "Upgrade required", upgrade_required: true, minimum_plan }, { status: 403 });

  const body = await req.json() as { scenario_text?: string; adversary_type?: string; jurisdiction?: string };
  const scenario_text = (body.scenario_text ?? "").trim();
  const adversary_type = (body.adversary_type ?? "regulator") as "regulator" | "competitor" | "consumer" | "creator" | "brand";
  const jurisdiction = body.jurisdiction ?? "IN";
  if (!scenario_text) return NextResponse.json({ error: "scenario_text is required" }, { status: 400 });

  const corpusEntries = await getRelevantCorpus([adversary_type, "litigation", "dispute"], jurisdiction, 4);
  const corpusContext = formatCorpusForPrompt(corpusEntries);

  const anthropic = getAnthropicClient();
  const msg = await anthropic.messages.create({
    model: MODELS.SONNET,
    max_tokens: 2500,
    system: ADVERSARY_LENS_SYSTEM,
    messages: [{ role: "user", content: buildAdversaryLensPrompt(scenario_text, adversary_type, jurisdiction, corpusContext) }],
  });
  const raw = msg.content[0].type === "text" ? msg.content[0].text : "{}";
  let result: Record<string, unknown> = {
    adversary_arguments: [], evidence_they_seek: [], attack_vectors: [],
    likely_outcome: "", your_vulnerabilities: [], recommended_defence: [],
  };
  try { result = JSON.parse(raw) as Record<string, unknown>; } catch { /* keep default */ }

  const serviceClient = await createServiceClient();
  await serviceClient.from("adversary_analyses").insert({
    organisation_id: profile.organisation_id,
    scenario_text,
    adversary_type,
    jurisdiction,
    analysis_json: result,
    created_by: user.id,
  });

  return NextResponse.json(result);
}
