import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { getAnthropicClient } from "@/lib/anthropic/client";
import { MODELS } from "@/lib/anthropic/utils";
import { LIABILITY_MAP_SYSTEM, buildLiabilityMapPrompt } from "@/lib/anthropic/prompts/liability-map";
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

  const body = await req.json() as { legal_notice_id?: string; jurisdiction?: string };
  const { legal_notice_id, jurisdiction = "IN" } = body;
  if (!legal_notice_id) return NextResponse.json({ error: "legal_notice_id is required" }, { status: 400 });

  const { data: notice } = await supabase
    .from("legal_notices")
    .select("notice_text, triage_json, organisation_id")
    .eq("id", legal_notice_id)
    .single();
  if (!notice || notice.organisation_id !== profile.organisation_id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const corpusEntries = await getRelevantCorpus(["liability", "indemnity", "legal notice"], jurisdiction, 5);
  const corpusContext = formatCorpusForPrompt(corpusEntries);

  const anthropic = getAnthropicClient();
  const msg = await anthropic.messages.create({
    model: MODELS.SONNET,
    max_tokens: 2500,
    system: LIABILITY_MAP_SYSTEM,
    messages: [{
      role: "user",
      content: buildLiabilityMapPrompt(notice.notice_text ?? "", jurisdiction, corpusContext),
    }],
  });
  const raw = msg.content[0].type === "text" ? msg.content[0].text : "{}";
  let result: Record<string, unknown> = { parties: [], total_exposure_estimate: "", mitigation_options: [], indemnity_chain: "" };
  try { result = JSON.parse(raw) as Record<string, unknown>; } catch { /* keep default */ }

  const serviceClient = await createServiceClient();
  await serviceClient.from("liability_maps").insert({
    organisation_id: profile.organisation_id,
    legal_notice_id,
    parties_json: (result.parties as Record<string, unknown>[]) ?? [],
    exposure_json: { total: result.total_exposure_estimate, indemnity_chain: result.indemnity_chain },
    mitigation_json: (result.mitigation_options as string[]) ?? [],
    jurisdiction,
  });

  await serviceClient.from("legal_notices")
    .update({ liability_map_json: result })
    .eq("id", legal_notice_id);

  return NextResponse.json(result);
}
