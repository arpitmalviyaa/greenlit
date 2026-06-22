import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { getAnthropicClient } from "@/lib/anthropic/client";
import { MODELS } from "@/lib/anthropic/utils";
import { TERM_SHEET_GENERATE_SYSTEM, buildTermSheetGeneratePrompt } from "@/lib/anthropic/prompts/term-sheet-generate";

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

  const body = await req.json() as { transcript_id?: string; contract_id?: string; jurisdiction?: string };
  const { transcript_id, contract_id, jurisdiction = "IN" } = body;
  if (!transcript_id) return NextResponse.json({ error: "transcript_id is required" }, { status: 400 });

  const { data: transcript } = await supabase
    .from("meeting_transcripts")
    .select("title, analysis_json, organisation_id")
    .eq("id", transcript_id)
    .single();
  if (!transcript || transcript.organisation_id !== profile.organisation_id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (contract_id) {
    const { data: contract } = await supabase
      .from("contracts")
      .select("id")
      .eq("id", contract_id)
      .eq("organisation_id", profile.organisation_id)
      .single();
    if (!contract) return NextResponse.json({ error: "Contract not found" }, { status: 404 });
  }

  const analysis = transcript.analysis_json as { agreed_terms?: string[] } | null;
  const agreedTerms = analysis?.agreed_terms ?? [];

  const anthropic = getAnthropicClient();
  const msg = await anthropic.messages.create({
    model: MODELS.HAIKU,
    max_tokens: 800,
    system: TERM_SHEET_GENERATE_SYSTEM,
    messages: [{ role: "user", content: buildTermSheetGeneratePrompt(agreedTerms, jurisdiction) }],
  });
  const raw = msg.content[0].type === "text" ? msg.content[0].text : "{}";
  let termsJson: Record<string, unknown> = {};
  try { termsJson = JSON.parse(raw) as Record<string, unknown>; } catch { /* keep default */ }

  const serviceClient = await createServiceClient();
  const { data: saved } = await serviceClient.from("term_sheets").insert({
    organisation_id: profile.organisation_id,
    transcript_id,
    contract_id: contract_id ?? null,
    title: `Term Sheet — ${transcript.title}`,
    jurisdiction,
    terms_json: termsJson,
    status: "draft",
    created_by: user.id,
  }).select("id").single();

  await serviceClient.from("meeting_transcripts")
    .update({ term_sheet_json: termsJson })
    .eq("id", transcript_id);

  return NextResponse.json({ terms_json: termsJson, term_sheet_id: saved?.id ?? null });
}
