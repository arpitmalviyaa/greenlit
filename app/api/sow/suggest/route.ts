import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAnthropicClient } from "@/lib/anthropic/client";
import { MODELS } from "@/lib/anthropic/utils";
import { SOW_SUGGEST_SYSTEM, sowSuggestUser } from "@/lib/anthropic/prompts/sow-suggest";

function safeParse<T>(text: string): T | null {
  try {
    return JSON.parse(text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim()) as T;
  } catch { return null; }
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json() as { sow_id?: string; field?: string; current_value?: string; jurisdiction?: string };
  const { field, current_value, jurisdiction = "IN" } = body;

  if (!field || !current_value) return NextResponse.json({ error: "Missing field or current_value" }, { status: 400 });

  const ai = getAnthropicClient();
  const res = await ai.messages.create({
    model: MODELS.HAIKU,
    max_tokens: 500,
    system: SOW_SUGGEST_SYSTEM,
    messages: [{ role: "user", content: sowSuggestUser(field, current_value, jurisdiction) }],
  });

  const result = safeParse<{ suggestions: string[]; reasoning: string }>(
    res.content[0].type === "text" ? res.content[0].text : "{}"
  ) ?? { suggestions: [], reasoning: "" };

  return NextResponse.json(result);
}
