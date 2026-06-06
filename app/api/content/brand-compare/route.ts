import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { getAnthropicClient } from "@/lib/anthropic/client";
import { MODELS } from "@/lib/anthropic/utils";
import { BRAND_COMPARE_SYSTEM, buildBrandComparePrompt } from "@/lib/anthropic/prompts/brand-compare";

export interface BrandCompareResult {
  verdict: "safe" | "caution" | "risk";
  issues: string[];
  suggestions: string[];
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

  const body = await req.json() as { content?: string; brand_name?: string; jurisdiction?: string };
  const content = (body.content ?? "").trim();
  const brand_name = (body.brand_name ?? "").trim();
  const jurisdiction = (body.jurisdiction ?? "IN").trim();

  if (!content) return NextResponse.json({ error: "content is required" }, { status: 400 });
  if (!brand_name) return NextResponse.json({ error: "brand_name is required" }, { status: 400 });

  const anthropic = getAnthropicClient();
  const message = await anthropic.messages.create({
    model: MODELS.HAIKU,
    max_tokens: 600,
    system: BRAND_COMPARE_SYSTEM,
    messages: [{ role: "user", content: buildBrandComparePrompt(content, brand_name, jurisdiction) }],
  });

  const raw = message.content[0].type === "text" ? message.content[0].text : "{}";
  let result: BrandCompareResult = { verdict: "safe", issues: [], suggestions: [] };
  try {
    const parsed = JSON.parse(raw) as Partial<BrandCompareResult>;
    result = {
      verdict: parsed.verdict ?? "safe",
      issues: Array.isArray(parsed.issues) ? parsed.issues : [],
      suggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions : [],
    };
  } catch { /* keep default */ }

  const serviceClient = await createServiceClient();
  await serviceClient.from("content_advanced_scans").insert({
    organisation_id: profile.organisation_id,
    scan_type: "brand_compare",
    input_json: { content: content.slice(0, 500), brand_name, jurisdiction },
    result_json: result as unknown as Record<string, unknown>,
    jurisdiction,
    created_by: user.id,
  });

  return NextResponse.json(result);
}
