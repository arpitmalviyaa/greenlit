import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { getAnthropicClient } from "@/lib/anthropic/client";
import { MODELS } from "@/lib/anthropic/utils";
import { CLAIM_EXTRACT_SYSTEM, buildClaimExtractPrompt } from "@/lib/anthropic/prompts/claim-extract";
import { CLAIM_ANALYSE_SYSTEM, buildClaimAnalysePrompt } from "@/lib/anthropic/prompts/claim-analyse";
import { getRelevantCorpus, formatCorpusForPrompt } from "@/lib/corpus/index";

export interface ClaimAnalysisResult {
  verdict: "substantiated" | "unsubstantiated" | "needs_evidence" | "misleading";
  risk_score: number;
  burden_of_proof: string;
  what_evidence_needed: string[];
  regulatory_risk: string;
  analysis: string;
}

interface ExtractedClaim {
  claim_type: string;
  implicit_assertions: string[];
  burden_of_proof_standard: string;
  keywords: string[];
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("organisation_id")
    .eq("id", user.id)
    .single();
  if (!profile?.organisation_id) return NextResponse.json({ error: "No organisation" }, { status: 403 });

  const body = await req.json() as { claim_text?: string; category?: string; jurisdiction?: string };
  const claim_text = (body.claim_text ?? "").trim();
  const category = (body.category ?? "other").trim();
  const jurisdiction = (body.jurisdiction ?? "IN").trim();

  if (!claim_text) return NextResponse.json({ error: "claim_text is required" }, { status: 400 });

  const anthropic = getAnthropicClient();

  // Pass 1: Haiku extracts claim structure
  const extractMsg = await anthropic.messages.create({
    model: MODELS.HAIKU,
    max_tokens: 600,
    system: CLAIM_EXTRACT_SYSTEM,
    messages: [{ role: "user", content: buildClaimExtractPrompt(claim_text, category) }],
  });
  const extractRaw = extractMsg.content[0].type === "text" ? extractMsg.content[0].text : "{}";
  let extracted: ExtractedClaim = { claim_type: "", implicit_assertions: [], burden_of_proof_standard: "", keywords: [] };
  try { extracted = JSON.parse(extractRaw) as ExtractedClaim; } catch { /* keep default */ }

  // Fetch corpus before Pass 2
  const topics = [category, ...extracted.keywords.slice(0, 3)];
  const corpusEntries = await getRelevantCorpus(topics, jurisdiction, 5);
  const corpusContext = formatCorpusForPrompt(corpusEntries);

  // Pass 2: Sonnet deep analysis
  const analyseMsg = await anthropic.messages.create({
    model: MODELS.SONNET,
    max_tokens: 2500,
    system: CLAIM_ANALYSE_SYSTEM,
    messages: [{
      role: "user",
      content: buildClaimAnalysePrompt(claim_text, category, jurisdiction, JSON.stringify(extracted), corpusContext),
    }],
  });
  const analyseRaw = analyseMsg.content[0].type === "text" ? analyseMsg.content[0].text : "{}";
  let result: ClaimAnalysisResult = {
    verdict: "needs_evidence",
    risk_score: 50,
    burden_of_proof: "",
    what_evidence_needed: [],
    regulatory_risk: "",
    analysis: "",
  };
  try {
    const parsed = JSON.parse(analyseRaw) as Partial<ClaimAnalysisResult>;
    result = {
      verdict: parsed.verdict ?? "needs_evidence",
      risk_score: Math.min(100, Math.max(0, Math.round(Number(parsed.risk_score ?? 50)))),
      burden_of_proof: parsed.burden_of_proof ?? "",
      what_evidence_needed: Array.isArray(parsed.what_evidence_needed) ? parsed.what_evidence_needed : [],
      regulatory_risk: parsed.regulatory_risk ?? "",
      analysis: parsed.analysis ?? "",
    };
  } catch { /* keep default */ }

  // Save to claims table via service client
  const serviceClient = await createServiceClient();
  const { data: claim, error: claimError } = await serviceClient.from("claims").insert({
    organisation_id: profile.organisation_id,
    claim_text,
    category: category as "performance" | "health" | "financial" | "environmental" | "comparative" | "testimonial" | "other",
    jurisdiction,
    verdict: result.verdict,
    risk_score: result.risk_score,
    analysis_json: result as unknown as Record<string, unknown>,
    created_by: user.id,
  }).select("id").single();

  if (!claimError && claim?.id) {
    // Insert audit log — server-side only
    await serviceClient.from("claim_audit_log").insert({
      claim_id: claim.id,
      action: "created",
      performed_by: user.id,
      metadata: { category, jurisdiction },
    });
  }

  return NextResponse.json({ ...result, claim_id: claim?.id ?? null });
}
