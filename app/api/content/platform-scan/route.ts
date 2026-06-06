import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { getAnthropicClient } from "@/lib/anthropic/client";
import { MODELS } from "@/lib/anthropic/utils";
import { PLATFORM_SCAN_SYSTEM, buildPlatformScanPrompt } from "@/lib/anthropic/prompts/platform-scan";

export type PlatformName = "instagram" | "youtube" | "twitter" | "linkedin" | "tiktok";

export interface PlatformResult {
  platform: string;
  verdict: "safe" | "caution" | "risk";
  flags: string[];
}

export interface PlatformScanResult {
  results: PlatformResult[];
}

const VALID_PLATFORMS = new Set<PlatformName>(["instagram", "youtube", "twitter", "linkedin", "tiktok"]);

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

  const body = await req.json() as { content?: string; platforms?: string[]; jurisdiction?: string };
  const content = (body.content ?? "").trim();
  const jurisdiction = (body.jurisdiction ?? "IN").trim();
  const platforms = (Array.isArray(body.platforms) ? body.platforms : [])
    .filter((p): p is PlatformName => VALID_PLATFORMS.has(p as PlatformName));

  if (!content) return NextResponse.json({ error: "content is required" }, { status: 400 });
  if (!platforms.length) return NextResponse.json({ error: "At least one valid platform required" }, { status: 400 });

  const anthropic = getAnthropicClient();
  const message = await anthropic.messages.create({
    model: MODELS.HAIKU,
    max_tokens: 1000,
    system: PLATFORM_SCAN_SYSTEM,
    messages: [{ role: "user", content: buildPlatformScanPrompt(content, platforms, jurisdiction) }],
  });

  const raw = message.content[0].type === "text" ? message.content[0].text : "{}";
  let result: PlatformScanResult = { results: [] };
  try {
    const parsed = JSON.parse(raw) as Partial<PlatformScanResult>;
    result = {
      results: Array.isArray(parsed.results) ? parsed.results : [],
    };
  } catch { /* keep default */ }

  const serviceClient = await createServiceClient();
  await serviceClient.from("content_advanced_scans").insert({
    organisation_id: profile.organisation_id,
    scan_type: "platform_scan",
    input_json: { content: content.slice(0, 500), platforms, jurisdiction },
    result_json: result as unknown as Record<string, unknown>,
    jurisdiction,
    created_by: user.id,
  });

  return NextResponse.json(result);
}
