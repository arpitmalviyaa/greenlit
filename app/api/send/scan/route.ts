import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { getAnthropicClient } from "@/lib/anthropic/client";
import { MODELS } from "@/lib/anthropic/utils";
import { SEND_SCAN_SYSTEM, buildSendScanPrompt } from "@/lib/anthropic/prompts/send-scan";

export interface SendScanResult {
  overall_risk: "high" | "medium" | "low" | "safe";
  send_recommendation: "send" | "review" | "do_not_send";
  issues: Array<{ type: string; excerpt: string; explanation: string; severity: string }>;
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
    content?: string;
    recipient_type?: string;
    channel?: string;
    jurisdiction?: string;
  };
  const content = (body.content ?? "").trim();
  const recipient_type = (body.recipient_type ?? "other") as "brand" | "creator" | "lawyer" | "public" | "regulator" | "other";
  const channel = (body.channel ?? "other") as "email" | "whatsapp" | "sms" | "social" | "legal_filing" | "other";
  const jurisdiction = (body.jurisdiction ?? "IN").trim();

  if (!content) return NextResponse.json({ error: "content is required" }, { status: 400 });

  const anthropic = getAnthropicClient();
  const msg = await anthropic.messages.create({
    model: MODELS.HAIKU,
    max_tokens: 800,
    system: SEND_SCAN_SYSTEM,
    messages: [{ role: "user", content: buildSendScanPrompt(content, recipient_type, channel, jurisdiction) }],
  });
  const raw = msg.content[0].type === "text" ? msg.content[0].text : "{}";
  let result: SendScanResult = { overall_risk: "safe", send_recommendation: "send", issues: [] };
  try {
    const parsed = JSON.parse(raw) as Partial<SendScanResult>;
    result = {
      overall_risk: parsed.overall_risk ?? "safe",
      send_recommendation: parsed.send_recommendation ?? "send",
      issues: Array.isArray(parsed.issues) ? parsed.issues : [],
    };
  } catch { /* keep default */ }

  const serviceClient = await createServiceClient();
  const { data: saved } = await serviceClient.from("send_scans").insert({
    organisation_id: profile.organisation_id,
    content,
    recipient_type,
    channel,
    jurisdiction,
    scan_result_json: result as unknown as Record<string, unknown>,
    created_by: user.id,
  }).select("id").single();

  return NextResponse.json({ ...result, send_scan_id: saved?.id ?? null });
}
