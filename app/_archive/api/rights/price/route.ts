import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { getAnthropicClient } from "@/lib/anthropic/client";
import { MODELS } from "@/lib/anthropic/utils";
import { RIGHTS_PRICE_SYSTEM, buildRightsPricePrompt } from "@/lib/anthropic/prompts/rights-price";

interface RightsPriceResult {
  suggested_range_low: number;
  suggested_range_high: number;
  reasoning: string;
  breakdown: Array<{ factor: string; impact: string }>;
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

  const body = await req.json() as {
    creator_id: string;
    content_type: string;
    platforms: string[];
    duration_days: number;
    territory: string;
    exclusivity: boolean;
    usage_types: string[];
    jurisdiction?: string;
    base_fee?: number;
  };

  if (!body.creator_id || !body.content_type || !body.platforms?.length || !body.duration_days || !body.territory || !body.usage_types?.length) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const jurisdiction = body.jurisdiction ?? "IN";
  const anthropic = getAnthropicClient();
  const msg = await anthropic.messages.create({
    model: MODELS.HAIKU,
    max_tokens: 700,
    system: RIGHTS_PRICE_SYSTEM,
    messages: [{
      role: "user",
      content: buildRightsPricePrompt(
        body.content_type,
        body.platforms,
        body.duration_days,
        body.territory,
        body.exclusivity ?? false,
        body.usage_types,
        jurisdiction,
        body.base_fee
      ),
    }],
  });

  const raw = msg.content[0].type === "text" ? msg.content[0].text : "{}";
  let result: RightsPriceResult = { suggested_range_low: 0, suggested_range_high: 0, reasoning: "", breakdown: [] };
  try { result = JSON.parse(raw) as RightsPriceResult; } catch { /* keep default */ }

  const service = await createServiceClient();
  await service.from("rights_valuations").insert({
    organisation_id: profile.organisation_id,
    creator_id: body.creator_id,
    content_type: body.content_type,
    platforms: body.platforms,
    duration_days: body.duration_days,
    territory: body.territory,
    exclusivity: body.exclusivity ?? false,
    usage_types: body.usage_types,
    jurisdiction,
    base_fee: body.base_fee ?? null,
    suggested_range_low: result.suggested_range_low,
    suggested_range_high: result.suggested_range_high,
    reasoning: result.reasoning,
  });

  return NextResponse.json(result);
}
