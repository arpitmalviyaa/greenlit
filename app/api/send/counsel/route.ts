import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { getAnthropicClient } from "@/lib/anthropic/client";
import { MODELS } from "@/lib/anthropic/utils";
import { SEND_COUNSEL_SYSTEM, buildSendCounselPrompt } from "@/lib/anthropic/prompts/send-counsel";
import { getRelevantCorpus, formatCorpusForPrompt } from "@/lib/corpus/index";

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
    question?: string;
    jurisdiction?: string;
    send_scan_id?: string;
  };
  const content = (body.content ?? "").trim();
  const question = (body.question ?? "").trim();
  const jurisdiction = (body.jurisdiction ?? "IN").trim();
  const send_scan_id = body.send_scan_id;

  if (!content || !question) {
    return NextResponse.json({ error: "content and question are required" }, { status: 400 });
  }

  const corpusEntries = await getRelevantCorpus(["communications law", "defamation", "privacy"], jurisdiction, 4);
  const corpusContext = formatCorpusForPrompt(corpusEntries);

  const anthropic = getAnthropicClient();
  const msg = await anthropic.messages.create({
    model: MODELS.SONNET,
    max_tokens: 2000,
    system: SEND_COUNSEL_SYSTEM,
    messages: [{ role: "user", content: buildSendCounselPrompt(content, question, jurisdiction, corpusContext) }],
  });
  const raw = msg.content[0].type === "text" ? msg.content[0].text : "{}";
  let result = { answer: "", caveats: [] as string[], recommended_action: "", relevant_law: [] as string[] };
  try {
    const parsed = JSON.parse(raw) as Partial<typeof result>;
    result = {
      answer: parsed.answer ?? "",
      caveats: Array.isArray(parsed.caveats) ? parsed.caveats : [],
      recommended_action: parsed.recommended_action ?? "",
      relevant_law: Array.isArray(parsed.relevant_law) ? parsed.relevant_law : [],
    };
  } catch { /* keep default */ }

  if (send_scan_id) {
    const serviceClient = await createServiceClient();
    await serviceClient.from("send_scans")
      .update({ counsel_json: { question, ...result } as unknown as Record<string, unknown> })
      .eq("id", send_scan_id)
      .eq("organisation_id", profile.organisation_id);
  }

  return NextResponse.json(result);
}
