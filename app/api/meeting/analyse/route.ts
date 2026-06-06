import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { getAnthropicClient } from "@/lib/anthropic/client";
import { MODELS } from "@/lib/anthropic/utils";
import { MEETING_EXTRACT_SYSTEM, buildMeetingExtractPrompt } from "@/lib/anthropic/prompts/meeting-extract";
import { MEETING_ANALYSE_SYSTEM, buildMeetingAnalysePrompt } from "@/lib/anthropic/prompts/meeting-analyse";
import { getRelevantCorpus, formatCorpusForPrompt } from "@/lib/corpus/index";
import { checkPlanAccess } from "@/lib/utils/plan-gate";

interface ExtractedMeeting {
  agreed_terms: string[];
  open_issues: string[];
  action_items: string[];
  risk_phrases: string[];
  commitments_made: string[];
  key_topics: string[];
}

export interface MeetingAnalysisResult {
  agreed_terms: string[];
  open_issues: string[];
  action_items: string[];
  risk_phrases: string[];
  legal_observations: string;
  recommended_followups: string[];
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

  const { allowed, minimum_plan } = await checkPlanAccess(profile.organisation_id, "meeting_counsel");
  if (!allowed) return NextResponse.json({ error: "Upgrade required", upgrade_required: true, minimum_plan }, { status: 403 });

  const body = await req.json() as {
    transcript_text?: string;
    jurisdiction?: string;
    participants?: string[];
    title?: string;
    meeting_date?: string;
  };
  const transcript_text = (body.transcript_text ?? "").trim();
  const jurisdiction = (body.jurisdiction ?? "IN").trim();
  const participants = body.participants ?? [];
  const title = (body.title ?? "Meeting").trim();
  const meeting_date = body.meeting_date ?? null;

  if (!transcript_text) return NextResponse.json({ error: "transcript_text is required" }, { status: 400 });

  const anthropic = getAnthropicClient();

  // Pass 1: Haiku extract
  const extractMsg = await anthropic.messages.create({
    model: MODELS.HAIKU,
    max_tokens: 700,
    system: MEETING_EXTRACT_SYSTEM,
    messages: [{ role: "user", content: buildMeetingExtractPrompt(transcript_text) }],
  });
  const extractRaw = extractMsg.content[0].type === "text" ? extractMsg.content[0].text : "{}";
  let extracted: ExtractedMeeting = { agreed_terms: [], open_issues: [], action_items: [], risk_phrases: [], commitments_made: [], key_topics: [] };
  try { extracted = JSON.parse(extractRaw) as ExtractedMeeting; } catch { /* keep default */ }

  // Corpus before Pass 2
  const corpusEntries = await getRelevantCorpus(["contract law", ...extracted.key_topics.slice(0, 3)], jurisdiction, 5);
  const corpusContext = formatCorpusForPrompt(corpusEntries);

  // Pass 2: Sonnet analyse
  const analyseMsg = await anthropic.messages.create({
    model: MODELS.SONNET,
    max_tokens: 2500,
    system: MEETING_ANALYSE_SYSTEM,
    messages: [{
      role: "user",
      content: buildMeetingAnalysePrompt(transcript_text, JSON.stringify(extracted), jurisdiction, corpusContext),
    }],
  });
  const analyseRaw = analyseMsg.content[0].type === "text" ? analyseMsg.content[0].text : "{}";
  let result: MeetingAnalysisResult = {
    agreed_terms: extracted.agreed_terms,
    open_issues: extracted.open_issues,
    action_items: extracted.action_items,
    risk_phrases: extracted.risk_phrases,
    legal_observations: "",
    recommended_followups: [],
  };
  try {
    const parsed = JSON.parse(analyseRaw) as Partial<MeetingAnalysisResult>;
    result = {
      agreed_terms: Array.isArray(parsed.agreed_terms) ? parsed.agreed_terms : result.agreed_terms,
      open_issues: Array.isArray(parsed.open_issues) ? parsed.open_issues : result.open_issues,
      action_items: Array.isArray(parsed.action_items) ? parsed.action_items : result.action_items,
      risk_phrases: Array.isArray(parsed.risk_phrases) ? parsed.risk_phrases : result.risk_phrases,
      legal_observations: parsed.legal_observations ?? "",
      recommended_followups: Array.isArray(parsed.recommended_followups) ? parsed.recommended_followups : [],
    };
  } catch { /* keep default */ }

  const serviceClient = await createServiceClient();
  const { data: saved } = await serviceClient.from("meeting_transcripts").insert({
    organisation_id: profile.organisation_id,
    title,
    transcript_text,
    jurisdiction,
    participants,
    meeting_date: meeting_date ?? undefined,
    analysis_json: result as unknown as Record<string, unknown>,
    created_by: user.id,
  }).select("id").single();

  return NextResponse.json({ ...result, transcript_id: saved?.id ?? null });
}
