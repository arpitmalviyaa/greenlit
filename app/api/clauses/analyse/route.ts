import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAnthropicClient } from "@/lib/anthropic/client";
import { MODELS } from "@/lib/anthropic/utils";
import { CLAUSE_ANALYSE_SYSTEM, buildClauseAnalysePrompt } from "@/lib/anthropic/prompts/clause-analyse";

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase.from("profiles").select("organisation_id").eq("id", user.id).single();
  if (!profile?.organisation_id) return NextResponse.json({ error: "No organisation" }, { status: 403 });

  const body = await req.json() as { clause_text?: string; clause_type?: string; jurisdiction?: string };
  const clause_text = (body.clause_text ?? "").trim();
  const clause_type = body.clause_type ?? "other";
  const jurisdiction = body.jurisdiction ?? "IN";
  if (!clause_text) return NextResponse.json({ error: "clause_text is required" }, { status: 400 });

  const anthropic = getAnthropicClient();
  const msg = await anthropic.messages.create({
    model: MODELS.HAIKU,
    max_tokens: 600,
    system: CLAUSE_ANALYSE_SYSTEM,
    messages: [{ role: "user", content: buildClauseAnalysePrompt(clause_text, clause_type, jurisdiction) }],
  });
  const raw = msg.content[0].type === "text" ? msg.content[0].text : "{}";
  let result = { risk_level: "standard", plain_english: "", negotiation_tips: [] as string[], suggested_alternative: "" };
  try {
    const parsed = JSON.parse(raw) as Partial<typeof result>;
    result = {
      risk_level: parsed.risk_level ?? "standard",
      plain_english: parsed.plain_english ?? "",
      negotiation_tips: Array.isArray(parsed.negotiation_tips) ? parsed.negotiation_tips : [],
      suggested_alternative: parsed.suggested_alternative ?? "",
    };
  } catch { /* keep default */ }

  return NextResponse.json(result);
}
