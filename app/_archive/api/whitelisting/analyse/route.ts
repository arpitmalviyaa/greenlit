import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { getAnthropicClient } from "@/lib/anthropic/client";
import { MODELS } from "@/lib/anthropic/utils";
import { WHITELISTING_ANALYSE_SYSTEM, buildWhitelistingAnalysePrompt } from "@/lib/anthropic/prompts/whitelisting-analyse";
import { getRelevantCorpus, formatCorpusForPrompt } from "@/lib/corpus/index";

interface WhitelistingAnalysis {
  verdict: string;
  risks: string[];
  missing_clauses: string[];
  recommended_amendments: string[];
  compliance_notes: string;
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
    brand_name: string;
    platform: string;
    content_description: string;
    requested_rights: string[];
    jurisdiction?: string;
    sow_id?: string;
  };

  if (!body.creator_id || !body.brand_name || !body.platform || !body.content_description || !body.requested_rights?.length) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const jurisdiction = body.jurisdiction ?? "IN";
  const topics = ["whitelisting", "influencer advertising", body.platform, "creator rights"];
  const corpusEntries = await getRelevantCorpus(topics, jurisdiction, 4);
  const corpusContext = formatCorpusForPrompt(corpusEntries);

  const anthropic = getAnthropicClient();
  const msg = await anthropic.messages.create({
    model: MODELS.SONNET,
    max_tokens: 2000,
    system: WHITELISTING_ANALYSE_SYSTEM,
    messages: [{
      role: "user",
      content: buildWhitelistingAnalysePrompt(
        body.creator_id,
        body.brand_name,
        body.platform,
        body.content_description,
        body.requested_rights,
        jurisdiction,
        corpusContext
      ),
    }],
  });

  const raw = msg.content[0].type === "text" ? msg.content[0].text : "{}";
  let analysis: WhitelistingAnalysis = { verdict: "", risks: [], missing_clauses: [], recommended_amendments: [], compliance_notes: "" };
  try { analysis = JSON.parse(raw) as WhitelistingAnalysis; } catch { /* keep default */ }

  const service = await createServiceClient();
  const { data: record } = await service
    .from("whitelisting_requests")
    .insert({
      organisation_id: profile.organisation_id,
      creator_id: body.creator_id,
      brand_name: body.brand_name,
      platform: body.platform as "instagram" | "youtube" | "twitter" | "linkedin" | "tiktok",
      content_description: body.content_description,
      requested_rights: body.requested_rights,
      jurisdiction,
      sow_id: body.sow_id ?? null,
      analysis_json: analysis as unknown as Record<string, unknown>,
      status: "pending_review",
    })
    .select("id")
    .single();

  return NextResponse.json({ analysis, request_id: record?.id ?? null });
}
