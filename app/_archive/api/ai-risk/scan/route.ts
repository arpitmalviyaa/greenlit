import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { getAnthropicClient } from "@/lib/anthropic/client";
import { MODELS } from "@/lib/anthropic/utils";
import { AI_RISK_SCAN_SYSTEM, buildAiRiskScanPrompt } from "@/lib/anthropic/prompts/ai-risk-scan";
import { getRelevantCorpus, formatCorpusForPrompt } from "@/lib/corpus/index";

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase.from("profiles").select("organisation_id").eq("id", user.id).single();
  if (!profile?.organisation_id) return NextResponse.json({ error: "No organisation" }, { status: 403 });

  const body = await req.json() as {
    workflow_description?: string;
    ai_tools_used?: string[];
    jurisdiction?: string;
  };
  const workflow_description = (body.workflow_description ?? "").trim();
  const ai_tools_used = body.ai_tools_used ?? [];
  const jurisdiction = body.jurisdiction ?? "IN";
  if (!workflow_description) return NextResponse.json({ error: "workflow_description is required" }, { status: 400 });

  const corpusEntries = await getRelevantCorpus(["AI regulation", "data privacy", "DPDP", "AI liability"], jurisdiction, 4);
  const corpusContext = formatCorpusForPrompt(corpusEntries);

  const anthropic = getAnthropicClient();
  const msg = await anthropic.messages.create({
    model: MODELS.SONNET,
    max_tokens: 2500,
    system: AI_RISK_SCAN_SYSTEM,
    messages: [{ role: "user", content: buildAiRiskScanPrompt(workflow_description, ai_tools_used, jurisdiction, corpusContext) }],
  });
  const raw = msg.content[0].type === "text" ? msg.content[0].text : "{}";
  let result: {
    risks: unknown[];
    overall_risk: string;
    disclosure_obligations: string[];
    recommended_policies: string[];
  } = { risks: [], overall_risk: "medium", disclosure_obligations: [], recommended_policies: [] };
  try {
    const parsed = JSON.parse(raw) as Partial<typeof result>;
    result = {
      risks: Array.isArray(parsed.risks) ? parsed.risks : [],
      overall_risk: parsed.overall_risk ?? "medium",
      disclosure_obligations: Array.isArray(parsed.disclosure_obligations) ? parsed.disclosure_obligations : [],
      recommended_policies: Array.isArray(parsed.recommended_policies) ? parsed.recommended_policies : [],
    };
  } catch { /* keep default */ }

  const serviceClient = await createServiceClient();
  await serviceClient.from("ai_workflow_scans").insert({
    organisation_id: profile.organisation_id,
    workflow_description,
    ai_tools_used,
    jurisdiction,
    risk_report_json: result as unknown as Record<string, unknown>,
    created_by: user.id,
  });

  return NextResponse.json(result);
}
