import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAnthropicClient } from "@/lib/anthropic/client";
import { MODELS } from "@/lib/anthropic/utils";
import {
  COMPARE_EXTRACT_SYSTEM, compareExtractUser,
  COMPARE_ANALYSE_SYSTEM, compareAnalyseUser,
} from "@/lib/anthropic/prompts/contract-compare";

interface CompareResult {
  silent_changes: Array<{ clause_type: string; version_a: string; version_b: string; risk_change: "better" | "worse" | "neutral" }>;
  worsened_clauses: Array<{ clause_type: string; explanation: string }>;
  removed_protections: Array<{ clause_type: string; why_it_mattered: string }>;
  new_obligations: Array<{ clause_type: string; explanation: string }>;
  payment_term_changes: string[];
  overall_verdict: string;
}

function safeParse<T>(text: string): T | null {
  try {
    const cleaned = text.replace(/^```json?\n?/m, "").replace(/\n?```$/m, "").trim();
    return JSON.parse(cleaned) as T;
  } catch {
    return null;
  }
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

  const body = await request.json() as { contract_id_a?: string; contract_id_b?: string };
  const { contract_id_a, contract_id_b } = body;
  if (!contract_id_a || !contract_id_b) {
    return NextResponse.json({ error: "contract_id_a and contract_id_b required" }, { status: 400 });
  }
  if (contract_id_a === contract_id_b) {
    return NextResponse.json({ error: "Select two different contracts to compare" }, { status: 400 });
  }

  const [{ data: contractA }, { data: contractB }] = await Promise.all([
    supabase.from("contracts").select("raw_text, title").eq("id", contract_id_a).eq("organisation_id", profile.organisation_id).single(),
    supabase.from("contracts").select("raw_text, title").eq("id", contract_id_b).eq("organisation_id", profile.organisation_id).single(),
  ]);

  if (!contractA || !contractB) return NextResponse.json({ error: "One or both contracts not found" }, { status: 404 });
  if (!contractA.raw_text || !contractB.raw_text) {
    return NextResponse.json({ error: "Both contracts must have extracted text" }, { status: 422 });
  }

  const anthropic = getAnthropicClient();

  // ── PASS 1: Haiku — extract clause lists from both contracts in parallel ──
  let clauseJsonA: string;
  let clauseJsonB: string;
  try {
    const [respA, respB] = await Promise.all([
      anthropic.messages.create({
        model: MODELS.HAIKU,
        max_tokens: 800,
        system: COMPARE_EXTRACT_SYSTEM,
        messages: [{ role: "user", content: compareExtractUser(contractA.raw_text, "A") }],
      }),
      anthropic.messages.create({
        model: MODELS.HAIKU,
        max_tokens: 800,
        system: COMPARE_EXTRACT_SYSTEM,
        messages: [{ role: "user", content: compareExtractUser(contractB.raw_text, "B") }],
      }),
    ]);
    const rawA = respA.content[0].type === "text" ? respA.content[0].text : "";
    const rawB = respB.content[0].type === "text" ? respB.content[0].text : "";
    clauseJsonA = JSON.stringify(safeParse<object>(rawA) ?? rawA);
    clauseJsonB = JSON.stringify(safeParse<object>(rawB) ?? rawB);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Clause extraction failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  // ── PASS 2: Sonnet — compare clause lists ─────────────────────────────────
  let result: CompareResult;
  try {
    const resp = await anthropic.messages.create({
      model: MODELS.SONNET,
      max_tokens: 2000,
      system: COMPARE_ANALYSE_SYSTEM,
      messages: [{ role: "user", content: compareAnalyseUser(clauseJsonA, clauseJsonB) }],
    });
    const raw = resp.content[0].type === "text" ? resp.content[0].text : "";
    const parsed = safeParse<CompareResult>(raw);
    if (!parsed) throw new Error("Sonnet returned invalid JSON");
    result = parsed;
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Comparison analysis failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  return NextResponse.json({ result, titles: { a: contractA.title, b: contractB.title } }, { status: 200 });
}
