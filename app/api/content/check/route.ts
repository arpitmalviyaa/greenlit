import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { MODELS } from "@/lib/anthropic/utils";
import { AIOutputError, callStructured } from "@/lib/anthropic/structured";
import {
  CONTENT_CHECK_SYSTEM,
  ContentCheckSchema,
  contentCheckUser,
  type ContentCheck,
} from "@/lib/anthropic/prompts/content-check";
import { getRelevantCorpus, formatCorpusForPrompt } from "@/lib/corpus/index";
import type { ContentType, Json, ScanVerdict } from "@/types/database.types";

const CONTENT_TYPES = new Set(["script", "caption", "video", "reel", "ad", "podcast", "carousel"]);

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("organisation_id")
    .eq("id", user.id)
    .single();
  if (!profile?.organisation_id) {
    return NextResponse.json({ error: "No organisation found" }, { status: 403 });
  }

  const body = await request.json() as { content?: string; content_type?: string; jurisdiction?: string };
  const content = (body.content ?? "").trim();
  const contentType = CONTENT_TYPES.has(body.content_type ?? "") ? (body.content_type as ContentType) : "caption";
  const jurisdiction = body.jurisdiction ?? "IN";

  if (content.length < 10) {
    return NextResponse.json({ error: "Paste the content you want checked (at least a sentence)." }, { status: 400 });
  }

  const corpusEntries = await getRelevantCorpus(
    [contentType, "advertising", "influencer", "marketing"],
    jurisdiction,
    5
  );
  const corpusContext = formatCorpusForPrompt(corpusEntries);

  let result: ContentCheck;
  try {
    result = await callStructured({
      feature: "content.check",
      promptVersion: "v1",
      model: MODELS.SONNET,
      maxTokens: 2000,
      system: CONTENT_CHECK_SYSTEM,
      user: contentCheckUser(content, contentType, jurisdiction, corpusContext),
      schema: ContentCheckSchema,
      toolName: "report_content_check",
    });
  } catch (err) {
    const code = err instanceof AIOutputError ? err.code : "AI_REQUEST_FAILED";
    return NextResponse.json(
      { error: "The content check could not produce a valid result. Please retry.", code },
      { status: 502 }
    );
  }

  // Persist — certificate page reads this row by id
  let scanId: string | null = null;
  try {
    const service = await createServiceClient();
    const { data: saved } = await service
      .from("content_scans")
      .insert({
        organisation_id: profile.organisation_id,
        content_type: contentType,
        raw_content: content,
        scan_result_json: result as unknown as Json,
        risk_score: result.risk_score,
        verdict: result.verdict as ScanVerdict,
        checker_ids_run: ["sonnet_content_check_v1"],
        top_issues_json: result.issues.slice(0, 3) as unknown as Json,
        requires_lawyer: result.issues.some((i) => i.severity === "critical"),
        jurisdiction,
        created_by: user.id,
      })
      .select("id")
      .single();
    scanId = saved?.id ?? null;
  } catch (dbErr) {
    console.error("content_scans insert failed:", dbErr instanceof Error ? dbErr.message : dbErr);
  }

  return NextResponse.json({ ...result, scan_id: scanId });
}
