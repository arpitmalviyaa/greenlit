import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { getAnthropicClient } from "@/lib/anthropic/client";
import { MODELS } from "@/lib/anthropic/utils";
import {
  DEAL_TERM_ANALYSE_SYSTEM,
  buildDealTermAnalysePrompt,
  type DealTermAnalysis,
} from "@/lib/anthropic/prompts/deal-term-analyse";

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
    deal_room_id: string;
    term_json: object;
    jurisdiction?: string;
  };

  if (!body.deal_room_id || !body.term_json) {
    return NextResponse.json({ error: "deal_room_id and term_json required" }, { status: 400 });
  }

  const { data: room } = await supabase
    .from("deal_rooms")
    .select("id")
    .eq("id", body.deal_room_id)
    .eq("organisation_id", profile.organisation_id)
    .single();
  if (!room) return NextResponse.json({ error: "Deal room not found" }, { status: 404 });

  const jurisdiction = body.jurisdiction ?? "IN";
  const anthropic = getAnthropicClient();
  const msg = await anthropic.messages.create({
    model: MODELS.HAIKU,
    max_tokens: 700,
    system: DEAL_TERM_ANALYSE_SYSTEM,
    messages: [{ role: "user", content: buildDealTermAnalysePrompt(body.term_json, jurisdiction) }],
  });

  let analysis: DealTermAnalysis = { assessment: "", risk: "medium", counter_suggestions: [], red_flags: [] };
  try {
    const raw = msg.content[0].type === "text" ? msg.content[0].text : "{}";
    analysis = JSON.parse(raw) as DealTermAnalysis;
  } catch { /* keep default */ }

  // Save analysis to the latest term_proposal message via service client
  const service = await createServiceClient();
  const { data: latestMsg } = await service
    .from("deal_messages")
    .select("id")
    .eq("deal_room_id", body.deal_room_id)
    .eq("message_type", "term_proposal")
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (latestMsg?.id) {
    await service
      .from("deal_messages")
      .update({ ai_analysis_json: analysis as unknown as Record<string, unknown> })
      .eq("id", latestMsg.id);
  }

  return NextResponse.json({ analysis });
}
