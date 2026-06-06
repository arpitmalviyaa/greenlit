import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { getAnthropicClient } from "@/lib/anthropic/client";
import { MODELS } from "@/lib/anthropic/utils";
import { DARK_PATTERNS_SYSTEM, buildDarkPatternsPrompt } from "@/lib/anthropic/prompts/dark-patterns";

export interface DarkPattern {
  type: string;
  excerpt: string;
  explanation: string;
  severity: "high" | "medium" | "low";
}

export interface DarkPatternsResult {
  patterns: DarkPattern[];
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

  const body = await req.json() as { content?: string; jurisdiction?: string };
  const content = (body.content ?? "").trim();
  const jurisdiction = (body.jurisdiction ?? "IN").trim();

  if (!content) return NextResponse.json({ error: "content is required" }, { status: 400 });

  const anthropic = getAnthropicClient();
  const message = await anthropic.messages.create({
    model: MODELS.HAIKU,
    max_tokens: 700,
    system: DARK_PATTERNS_SYSTEM,
    messages: [{ role: "user", content: buildDarkPatternsPrompt(content, jurisdiction) }],
  });

  const raw = message.content[0].type === "text" ? message.content[0].text : "{}";
  let result: DarkPatternsResult = { patterns: [] };
  try {
    const parsed = JSON.parse(raw) as Partial<DarkPatternsResult>;
    result = { patterns: Array.isArray(parsed.patterns) ? parsed.patterns : [] };
  } catch { /* keep default */ }

  const serviceClient = await createServiceClient();
  await serviceClient.from("content_advanced_scans").insert({
    organisation_id: profile.organisation_id,
    scan_type: "dark_patterns",
    input_json: { content: content.slice(0, 500), jurisdiction },
    result_json: result as unknown as Record<string, unknown>,
    jurisdiction,
    created_by: user.id,
  });

  return NextResponse.json(result);
}
