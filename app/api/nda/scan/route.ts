import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { getAnthropicClient } from "@/lib/anthropic/client";
import { MODELS } from "@/lib/anthropic/utils";
import { NDA_EXTRACT_SYSTEM, buildNdaExtractPrompt } from "@/lib/anthropic/prompts/nda-extract";
import { NDA_TRAP_SYSTEM, buildNdaTrapPrompt } from "@/lib/anthropic/prompts/nda-trap";
import { getRelevantCorpus, formatCorpusForPrompt } from "@/lib/corpus/index";

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase.from("profiles").select("organisation_id").eq("id", user.id).single();
  if (!profile?.organisation_id) return NextResponse.json({ error: "No organisation" }, { status: 403 });

  const body = await req.json() as { nda_text?: string; jurisdiction?: string };
  const nda_text = (body.nda_text ?? "").trim();
  const jurisdiction = body.jurisdiction ?? "IN";
  if (!nda_text) return NextResponse.json({ error: "nda_text is required" }, { status: 400 });

  const anthropic = getAnthropicClient();

  // Pass 1: Haiku extract
  const extractMsg = await anthropic.messages.create({
    model: MODELS.HAIKU,
    max_tokens: 700,
    system: NDA_EXTRACT_SYSTEM,
    messages: [{ role: "user", content: buildNdaExtractPrompt(nda_text) }],
  });
  const extractRaw = extractMsg.content[0].type === "text" ? extractMsg.content[0].text : "{}";
  let extracted: { clauses: unknown[] } = { clauses: [] };
  try { extracted = JSON.parse(extractRaw) as typeof extracted; } catch { /* keep default */ }

  // Corpus before Pass 2
  const corpusEntries = await getRelevantCorpus(["NDA", "confidentiality", "non-disclosure agreement", "IP assignment"], jurisdiction, 4);
  const corpusContext = formatCorpusForPrompt(corpusEntries);

  // Pass 2: Sonnet trap detection
  const trapMsg = await anthropic.messages.create({
    model: MODELS.SONNET,
    max_tokens: 2500,
    system: NDA_TRAP_SYSTEM,
    messages: [{
      role: "user",
      content: buildNdaTrapPrompt(nda_text, JSON.stringify(extracted), jurisdiction, corpusContext),
    }],
  });
  const trapRaw = trapMsg.content[0].type === "text" ? trapMsg.content[0].text : "{}";
  let result: {
    traps: unknown[];
    safe_clauses: string[];
    overall_verdict: "safe" | "caution" | "dangerous";
    recommended_redlines: string[];
  } = { traps: [], safe_clauses: [], overall_verdict: "caution", recommended_redlines: [] };
  try {
    const parsed = JSON.parse(trapRaw) as Partial<typeof result>;
    result = {
      traps: Array.isArray(parsed.traps) ? parsed.traps : [],
      safe_clauses: Array.isArray(parsed.safe_clauses) ? parsed.safe_clauses : [],
      overall_verdict: parsed.overall_verdict ?? "caution",
      recommended_redlines: Array.isArray(parsed.recommended_redlines) ? parsed.recommended_redlines : [],
    };
  } catch { /* keep default */ }

  const serviceClient = await createServiceClient();
  const { data: saved } = await serviceClient.from("nda_scans").insert({
    organisation_id: profile.organisation_id,
    nda_text,
    jurisdiction,
    traps_json: result.traps as unknown as Record<string, unknown>[],
    safe_clauses_json: result.safe_clauses as unknown as Record<string, unknown>,
    overall_verdict: result.overall_verdict,
    created_by: user.id,
  }).select("id").single();

  return NextResponse.json({ ...result, nda_scan_id: saved?.id ?? null });
}
