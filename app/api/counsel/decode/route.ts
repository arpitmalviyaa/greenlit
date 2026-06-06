import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAnthropicClient } from "@/lib/anthropic/client";
import { MODELS } from "@/lib/anthropic/utils";
import { CLAUSE_DECODE_SYSTEM, clauseDecodeUser } from "@/lib/anthropic/prompts/clause-decode";

interface DecodeResult {
  plain_english: string;
  what_it_means_for_you: string;
  risk_level: "low" | "medium" | "high";
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

  const body = await request.json() as { clause_text?: string };
  const { clause_text } = body;
  if (!clause_text?.trim()) {
    return NextResponse.json({ error: "clause_text required" }, { status: 400 });
  }

  const anthropic = getAnthropicClient();

  try {
    const resp = await anthropic.messages.create({
      model: MODELS.HAIKU,
      max_tokens: 400,
      system: CLAUSE_DECODE_SYSTEM,
      messages: [{ role: "user", content: clauseDecodeUser(clause_text) }],
    });
    const raw = resp.content[0].type === "text" ? resp.content[0].text : "";
    const result = safeParse<DecodeResult>(raw);
    if (!result) return NextResponse.json({ error: "Failed to parse AI response" }, { status: 500 });
    return NextResponse.json({ result }, { status: 200 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Decode failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
