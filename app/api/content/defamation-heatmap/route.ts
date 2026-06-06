import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { getAnthropicClient } from "@/lib/anthropic/client";
import { MODELS } from "@/lib/anthropic/utils";
import { DEFAMATION_HEATMAP_SYSTEM, buildDefamationHeatmapPrompt } from "@/lib/anthropic/prompts/defamation-heatmap";

export interface DefamationSpan {
  text: string;
  start: number;
  end: number;
  risk: "high" | "medium" | "low";
  reason: string;
}

export interface DefamationHeatmapResult {
  spans: DefamationSpan[];
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
    max_tokens: 800,
    system: DEFAMATION_HEATMAP_SYSTEM,
    messages: [{ role: "user", content: buildDefamationHeatmapPrompt(content, jurisdiction) }],
  });

  const raw = message.content[0].type === "text" ? message.content[0].text : "{}";
  let result: DefamationHeatmapResult = { spans: [] };
  try {
    result = JSON.parse(raw) as DefamationHeatmapResult;
    if (!Array.isArray(result.spans)) result = { spans: [] };
  } catch { result = { spans: [] }; }

  // Persist
  const serviceClient = await createServiceClient();
  await serviceClient.from("content_advanced_scans").insert({
    organisation_id: profile.organisation_id,
    scan_type: "defamation_heatmap",
    input_json: { content: content.slice(0, 500), jurisdiction },
    result_json: result as unknown as Record<string, unknown>,
    jurisdiction,
    created_by: user.id,
  });

  return NextResponse.json(result);
}
