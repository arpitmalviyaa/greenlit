import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { getAnthropicClient } from "@/lib/anthropic/client";
import { MODELS } from "@/lib/anthropic/utils";
import { TAKEDOWN_GENERATE_SYSTEM, buildTakedownGeneratePrompt } from "@/lib/anthropic/prompts/takedown-generate";
import { getRelevantCorpus, formatCorpusForPrompt } from "@/lib/corpus/index";

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase.from("profiles").select("organisation_id").eq("id", user.id).single();
  if (!profile?.organisation_id) return NextResponse.json({ error: "No organisation" }, { status: 403 });

  const body = await req.json() as { infringement_record_id?: string; notice_type?: string; jurisdiction?: string };
  const { infringement_record_id, notice_type = "dmca", jurisdiction = "IN" } = body;
  if (!infringement_record_id) return NextResponse.json({ error: "infringement_record_id is required" }, { status: 400 });

  const { data: infringement } = await supabase
    .from("infringement_records")
    .select("infringing_url, platform, infringement_type, organisation_id, ip_record_id")
    .eq("id", infringement_record_id)
    .single();
  if (!infringement || infringement.organisation_id !== profile.organisation_id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { data: ipRecord } = await supabase
    .from("ip_records")
    .select("title, ip_type")
    .eq("id", infringement.ip_record_id)
    .single();

  const corpusEntries = await getRelevantCorpus(["IP infringement", "takedown notice", "copyright"], jurisdiction, 4);
  const corpusContext = formatCorpusForPrompt(corpusEntries);

  const anthropic = getAnthropicClient();
  const msg = await anthropic.messages.create({
    model: MODELS.SONNET,
    max_tokens: 2500,
    system: TAKEDOWN_GENERATE_SYSTEM,
    messages: [{
      role: "user",
      content: buildTakedownGeneratePrompt(
        infringement.infringing_url,
        infringement.platform,
        infringement.infringement_type,
        ipRecord?.title ?? "IP Asset",
        ipRecord?.ip_type ?? "copyright",
        notice_type,
        jurisdiction,
        corpusContext
      ),
    }],
  });
  const raw = msg.content[0].type === "text" ? msg.content[0].text : "{}";
  let result: { notice_text: string; filing_instructions: string[]; deadline_notes: string } = {
    notice_text: "",
    filing_instructions: [],
    deadline_notes: "",
  };
  try { result = JSON.parse(raw) as typeof result; } catch { /* keep default */ }

  const serviceClient = await createServiceClient();
  await serviceClient.from("takedown_notices").insert({
    organisation_id: profile.organisation_id,
    infringement_record_id,
    platform: infringement.platform,
    notice_type: notice_type as "dmca" | "platform_report" | "cease_and_desist" | "legal_demand",
    notice_text: result.notice_text,
    filing_instructions: result.filing_instructions,
    generated_by_ai: true,
    status: "draft",
  });

  return NextResponse.json(result);
}
