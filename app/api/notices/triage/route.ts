import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { getAnthropicClient } from "@/lib/anthropic/client";
import { MODELS } from "@/lib/anthropic/utils";
import { NOTICE_EXTRACT_SYSTEM, buildNoticeExtractPrompt } from "@/lib/anthropic/prompts/notice-extract";
import { NOTICE_TRIAGE_SYSTEM, buildNoticeTriagePrompt } from "@/lib/anthropic/prompts/notice-triage";
import { getRelevantCorpus, formatCorpusForPrompt } from "@/lib/corpus/index";

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("organisation_id, role")
    .eq("id", user.id)
    .single();
  if (!profile?.organisation_id) return NextResponse.json({ error: "No organisation" }, { status: 403 });
  if (profile.role !== "agency_admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json() as { notice_text?: string; jurisdiction?: string };
  const notice_text = (body.notice_text ?? "").trim();
  const jurisdiction = (body.jurisdiction ?? "IN").trim();
  if (!notice_text) return NextResponse.json({ error: "notice_text is required" }, { status: 400 });

  const anthropic = getAnthropicClient();

  // Pass 1: Haiku extract
  const extractMsg = await anthropic.messages.create({
    model: MODELS.HAIKU,
    max_tokens: 600,
    system: NOTICE_EXTRACT_SYSTEM,
    messages: [{ role: "user", content: buildNoticeExtractPrompt(notice_text) }],
  });
  const extractRaw = extractMsg.content[0].type === "text" ? extractMsg.content[0].text : "{}";
  let extracted: Record<string, unknown> = {};
  try { extracted = JSON.parse(extractRaw) as Record<string, unknown>; } catch { /* keep default */ }

  // Corpus
  const topics = ["legal notice", ...((extracted.key_topics as string[]) ?? []).slice(0, 3)];
  const corpusEntries = await getRelevantCorpus(topics, jurisdiction, 5);
  const corpusContext = formatCorpusForPrompt(corpusEntries);

  // Pass 2: Sonnet triage
  const triageMsg = await anthropic.messages.create({
    model: MODELS.SONNET,
    max_tokens: 2500,
    system: NOTICE_TRIAGE_SYSTEM,
    messages: [{
      role: "user",
      content: buildNoticeTriagePrompt(notice_text, JSON.stringify(extracted), jurisdiction, corpusContext),
    }],
  });
  const triageRaw = triageMsg.content[0].type === "text" ? triageMsg.content[0].text : "{}";
  let result: Record<string, unknown> = {
    notice_type: extracted.notice_type ?? "",
    sender: extracted.sender ?? "",
    deadline: extracted.deadline ?? "",
    urgency: "routine",
    relief_sought: extracted.relief_sought ?? "",
    legal_basis: extracted.legal_basis ?? "",
    response_strategy: "",
    immediate_actions: [],
    lawyer_referral: false,
    referral_reason: "",
  };
  try { result = JSON.parse(triageRaw) as Record<string, unknown>; } catch { /* keep default */ }

  // Save to legal_notices
  const serviceClient = await createServiceClient();
  const { data: notice } = await serviceClient.from("legal_notices").insert({
    organisation_id: profile.organisation_id,
    notice_text,
    notice_type: result.notice_type as string ?? null,
    sender: result.sender as string ?? null,
    triage_json: result,
    urgency: (result.urgency as "immediate" | "urgent" | "routine") ?? "routine",
    deadline: (result.deadline as string)?.match(/\d{4}-\d{2}-\d{2}/) ? result.deadline as string : null,
  }).select("id").single();

  return NextResponse.json({ ...result, legal_notice_id: notice?.id ?? null });
}
