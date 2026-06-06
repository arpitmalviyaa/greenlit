import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { getAnthropicClient } from "@/lib/anthropic/client";
import { MODELS } from "@/lib/anthropic/utils";
import { VENDOR_EXTRACT_SYSTEM, buildVendorExtractPrompt } from "@/lib/anthropic/prompts/vendor-extract";
import { VENDOR_SHIELD_SYSTEM, buildVendorShieldPrompt } from "@/lib/anthropic/prompts/vendor-shield";
import { getRelevantCorpus, formatCorpusForPrompt } from "@/lib/corpus/index";

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase.from("profiles").select("organisation_id").eq("id", user.id).single();
  if (!profile?.organisation_id) return NextResponse.json({ error: "No organisation" }, { status: 403 });

  const body = await req.json() as {
    vendor_name?: string;
    contract_text?: string;
    jurisdiction?: string;
  };
  const vendor_name = (body.vendor_name ?? "").trim();
  const contract_text = (body.contract_text ?? "").trim();
  const jurisdiction = body.jurisdiction ?? "IN";
  if (!vendor_name || !contract_text) return NextResponse.json({ error: "vendor_name and contract_text are required" }, { status: 400 });

  const anthropic = getAnthropicClient();

  // Pass 1: Haiku extract
  const extractMsg = await anthropic.messages.create({
    model: MODELS.HAIKU,
    max_tokens: 600,
    system: VENDOR_EXTRACT_SYSTEM,
    messages: [{ role: "user", content: buildVendorExtractPrompt(contract_text) }],
  });
  const extractRaw = extractMsg.content[0].type === "text" ? extractMsg.content[0].text : "{}";
  let extracted: Record<string, unknown> = {};
  try { extracted = JSON.parse(extractRaw) as Record<string, unknown>; } catch { /* keep default */ }

  // Corpus before Pass 2
  const corpusEntries = await getRelevantCorpus(["vendor contract", "data processor", "liability", "SLA"], jurisdiction, 4);
  const corpusContext = formatCorpusForPrompt(corpusEntries);

  // Pass 2: Sonnet shield
  const shieldMsg = await anthropic.messages.create({
    model: MODELS.SONNET,
    max_tokens: 2500,
    system: VENDOR_SHIELD_SYSTEM,
    messages: [{
      role: "user",
      content: buildVendorShieldPrompt(vendor_name, contract_text, JSON.stringify(extracted), jurisdiction, corpusContext),
    }],
  });
  const shieldRaw = shieldMsg.content[0].type === "text" ? shieldMsg.content[0].text : "{}";
  let result: {
    risk_score: number;
    gaps: string[];
    protections: string[];
    recommended_additions: string[];
    data_processor_compliant: boolean;
  } = { risk_score: 50, gaps: [], protections: [], recommended_additions: [], data_processor_compliant: false };
  try {
    const parsed = JSON.parse(shieldRaw) as Partial<typeof result>;
    result = {
      risk_score: Math.min(100, Math.max(0, Math.round(Number(parsed.risk_score ?? 50)))),
      gaps: Array.isArray(parsed.gaps) ? parsed.gaps : [],
      protections: Array.isArray(parsed.protections) ? parsed.protections : [],
      recommended_additions: Array.isArray(parsed.recommended_additions) ? parsed.recommended_additions : [],
      data_processor_compliant: parsed.data_processor_compliant ?? false,
    };
  } catch { /* keep default */ }

  const serviceClient = await createServiceClient();
  await serviceClient.from("vendor_contracts").insert({
    organisation_id: profile.organisation_id,
    vendor_name,
    contract_text,
    jurisdiction,
    shield_analysis_json: result as unknown as Record<string, unknown>,
    risk_score: result.risk_score,
    created_by: user.id,
  });

  return NextResponse.json(result);
}
