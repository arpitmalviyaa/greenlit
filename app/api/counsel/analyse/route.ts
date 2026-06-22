import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { getAnthropicClient } from "@/lib/anthropic/client";
import { MODELS } from "@/lib/anthropic/utils";
import { CONTRACT_EXTRACT_SYSTEM, contractExtractUser } from "@/lib/anthropic/prompts/contract-extract";
import { CONTRACT_ANALYSE_SYSTEM, contractAnalyseUser } from "@/lib/anthropic/prompts/contract-analyse";
import { getRelevantCorpus, formatCorpusForPrompt } from "@/lib/corpus/index";

interface AnalysisResult {
  risk_score: number;
  verdict: "safe" | "caution" | "high_risk" | "lawyer_required";
  risky_clauses: Array<{
    clause_text: string;
    issue: string;
    severity: "low" | "medium" | "high" | "critical";
    suggestion: string;
  }>;
  missing_clauses: Array<{ clause_type: string; why_needed: string }>;
  red_flags: Array<{ flag: string; explanation: string }>;
  payment_risk: "low" | "medium" | "high";
  ip_risk: "low" | "medium" | "high";
  termination_risk: "low" | "medium" | "high";
  lawyer_escalation_required: boolean;
  lawyer_escalation_reasons: string[];
}

function safeParse<T>(text: string): T | null {
  try {
    // Strip markdown fences if model ignores instructions
    const cleaned = text.replace(/^```json?\n?/m, "").replace(/\n?```$/m, "").trim();
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    return JSON.parse(start >= 0 && end > start ? cleaned.slice(start, end + 1) : cleaned) as T;
  } catch {
    return null;
  }
}

function clampRiskScore(n: unknown): number {
  const v = Number(n);
  return Number.isFinite(v) ? Math.min(100, Math.max(0, Math.round(v))) : 0;
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("organisation_id")
    .eq("id", user.id)
    .single();

  if (!profile?.organisation_id) {
    return NextResponse.json({ error: "No organisation found" }, { status: 403 });
  }

  const body = await request.json() as { contract_id?: string; jurisdiction?: string };
  const { contract_id, jurisdiction = "IN" } = body;
  if (!contract_id) return NextResponse.json({ error: "contract_id required" }, { status: 400 });

  // Fetch contract — RLS ensures org scoping
  const { data: contract } = await supabase
    .from("contracts")
    .select("id, title, raw_text, status, jurisdiction")
    .eq("id", contract_id)
    .eq("organisation_id", profile.organisation_id)
    .single();

  if (!contract) return NextResponse.json({ error: "Contract not found" }, { status: 404 });

  if (!contract.raw_text) {
    return NextResponse.json(
      { error: "No text extracted from this contract. Cannot analyse." },
      { status: 422 }
    );
  }

  // Use jurisdiction from request body, fallback to contract's stored value or 'IN'
  const effectiveJurisdiction = jurisdiction || (contract as { jurisdiction?: string }).jurisdiction || "IN";

  // Best-effort corpus retrieval — empty corpus never blocks analysis
  const corpusEntries = await getRelevantCorpus(
    [contract.title, "influencer", "creator", "marketing"],
    effectiveJurisdiction,
    5
  );
  const corpus_context = formatCorpusForPrompt(corpusEntries);

  const anthropic = getAnthropicClient();

  // ── PASS 1: Haiku — extract clause list ───────────────────────────────────
  let extractedJson: string;
  try {
    const extraction = await anthropic.messages.create({
      model: MODELS.HAIKU,
      max_tokens: 4000,
      system: CONTRACT_EXTRACT_SYSTEM,
      messages: [{ role: "user", content: contractExtractUser(contract.raw_text) }],
    });
    const raw = extraction.content[0].type === "text" ? extraction.content[0].text : "";
    // Validate it's parseable JSON before sending to Sonnet
    const parsed = safeParse<object>(raw);
    extractedJson = parsed ? JSON.stringify(parsed) : raw;
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Haiku extraction failed";
    return NextResponse.json({ error: `Clause extraction failed: ${msg}` }, { status: 500 });
  }

  // ── PASS 2: Sonnet — deep analysis on clause list only ────────────────────
  let analysis: AnalysisResult;
  try {
    const analysisResp = await anthropic.messages.create({
      model: MODELS.SONNET,
      max_tokens: 5000,
      system: CONTRACT_ANALYSE_SYSTEM,
      messages: [
        {
          role: "user",
          content: contractAnalyseUser(extractedJson, contract.title, effectiveJurisdiction, corpus_context),
        },
      ],
    });
    const raw = analysisResp.content[0].type === "text" ? analysisResp.content[0].text : "";
    const parsed = safeParse<AnalysisResult>(raw);
    if (!parsed) throw new Error("Sonnet returned invalid JSON");
    analysis = parsed;
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Sonnet analysis failed";
    return NextResponse.json({ error: `Analysis failed: ${msg}` }, { status: 500 });
  }

  // Normalise risk_score
  analysis.risk_score = clampRiskScore(analysis.risk_score);

  // ── Persist to DB ─────────────────────────────────────────────────────────
  const service = await createServiceClient();
  const { error: updateError } = await service
    .from("contracts")
    .update({
      analysis_json: analysis as unknown as import("@/types/database.types").Json,
      risk_score: analysis.risk_score,
      status: "reviewed",
      jurisdiction: effectiveJurisdiction,
    })
    .eq("id", contract_id);

  if (updateError) {
    // Still return analysis even if persist fails
    console.error("DB update failed:", updateError.message);
  }

  return NextResponse.json({ analysis }, { status: 200 });
}
