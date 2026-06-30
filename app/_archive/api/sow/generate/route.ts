import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { getAnthropicClient } from "@/lib/anthropic/client";
import { MODELS } from "@/lib/anthropic/utils";
import { SOW_EXTRACT_SYSTEM, sowExtractUser } from "@/lib/anthropic/prompts/sow-extract";
import { SOW_GENERATE_SYSTEM, sowGenerateUser } from "@/lib/anthropic/prompts/sow-generate";
import { getRelevantCorpus, formatCorpusForPrompt } from "@/lib/corpus/index";

interface GenerateSOWBody {
  campaign_brief: string;
  brand_name: string;
  creator_handle: string;
  platforms: string[];
  budget: number;
  currency: string;
  start_date: string;
  end_date: string;
  jurisdiction: string;
  template_id?: string;
}

function safeParse<T>(text: string): T | null {
  try {
    const cleaned = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    return JSON.parse(cleaned) as T;
  } catch {
    return null;
  }
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

  const body = await req.json() as GenerateSOWBody;
  const {
    campaign_brief, brand_name, creator_handle, platforms,
    budget, currency, start_date, end_date, jurisdiction, template_id,
  } = body;

  if (!campaign_brief || !brand_name || !creator_handle || !platforms?.length) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const ai = getAnthropicClient();

  // Pass 1: Haiku extracts key terms
  const extractRes = await ai.messages.create({
    model: MODELS.HAIKU,
    max_tokens: 600,
    system: SOW_EXTRACT_SYSTEM,
    messages: [{ role: "user", content: sowExtractUser(campaign_brief, platforms, budget, currency) }],
  });
  const extracted = safeParse<object>(extractRes.content[0].type === "text" ? extractRes.content[0].text : "{}") ?? {};

  // Fetch corpus before Pass 2
  const topics = ["SOW", "influencer", brand_name, ...platforms];
  const corpusEntries = await getRelevantCorpus(topics, jurisdiction, 5);
  const corpus_context = formatCorpusForPrompt(corpusEntries);

  // Pass 2: Sonnet generates full SOW
  const generateRes = await ai.messages.create({
    model: MODELS.SONNET,
    max_tokens: 2500,
    system: SOW_GENERATE_SYSTEM,
    messages: [{ role: "user", content: sowGenerateUser({ brand_name, creator_handle, platforms, budget, currency, start_date, end_date, jurisdiction, extracted, corpus_context }) }],
  });
  const rawText = generateRes.content[0].type === "text" ? generateRes.content[0].text : "{}";
  const sow_json = safeParse<{
    title?: string;
    deliverables?: Array<{ title: string; platform: string; content_type: string; quantity: number; due_date: string; value: number }>;
    payment_milestones?: Array<{ title: string; amount: number; due_date: string; trigger_event: string }>;
    [key: string]: unknown;
  }>(rawText) ?? {};

  const service = await createServiceClient();

  // Save SOW
  const totalValue = sow_json.payment_milestones?.reduce((sum: number, m) => sum + (m.amount ?? 0), 0) ?? budget;

  const { data: sow, error: sowError } = await service
    .from("sows")
    .insert({
      organisation_id: profile.organisation_id,
      title: (sow_json.title as string) ?? `SOW – ${brand_name}`,
      brand_name,
      jurisdiction,
      status: "draft",
      start_date: start_date || null,
      end_date: end_date || null,
      total_value: totalValue,
      currency: currency || "INR",
      sow_json: sow_json as never,
      template_id: template_id ?? null,
      created_by: user.id,
    })
    .select("id")
    .single();

  if (sowError || !sow) {
    return NextResponse.json({ error: "Failed to save SOW" }, { status: 500 });
  }

  // Insert deliverables
  if (sow_json.deliverables?.length) {
    const deliverableRows = sow_json.deliverables.map((d) => ({
      sow_id: sow.id,
      title: d.title,
      platform: (d.platform || "other") as "instagram" | "youtube" | "twitter" | "linkedin" | "tiktok" | "offline" | "other",
      content_type: (d.content_type || "other") as "post" | "reel" | "story" | "video" | "blog" | "podcast" | "other",
      quantity: d.quantity ?? 1,
      due_date: d.due_date || null,
      value: d.value ?? null,
      status: "pending" as const,
    }));
    await service.from("sow_deliverables").insert(deliverableRows);
  }

  // Insert milestones
  if (sow_json.payment_milestones?.length) {
    const milestoneRows = sow_json.payment_milestones.map((m) => ({
      sow_id: sow.id,
      title: m.title,
      amount: m.amount,
      due_date: m.due_date || null,
      trigger_event: m.trigger_event || null,
      status: "pending" as const,
    }));
    await service.from("sow_payment_milestones").insert(milestoneRows);
  }

  return NextResponse.json({ sow_id: sow.id, sow_json });
}
