import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { getAnthropicClient } from "@/lib/anthropic/client";
import { MODELS } from "@/lib/anthropic/utils";
import { CROSS_REF_SYSTEM, buildCrossRefPrompt } from "@/lib/anthropic/prompts/cross-ref";
import { getRelevantCorpus, formatCorpusForPrompt } from "@/lib/corpus/index";
import { checkPlanAccess } from "@/lib/utils/plan-gate";

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase.from("profiles").select("organisation_id").eq("id", user.id).single();
  if (!profile?.organisation_id) return NextResponse.json({ error: "No organisation" }, { status: 403 });

  const { allowed, minimum_plan } = await checkPlanAccess(profile.organisation_id, "cross_reference");
  if (!allowed) return NextResponse.json({ error: "Upgrade required", upgrade_required: true, minimum_plan }, { status: 403 });

  const body = await req.json() as { query_text?: string; jurisdictions?: string[] };
  const query_text = (body.query_text ?? "").trim();
  const jurisdictions = body.jurisdictions ?? ["IN"];
  if (!query_text) return NextResponse.json({ error: "query_text is required" }, { status: 400 });

  // Fetch corpus for each jurisdiction and combine (max 4000 chars total)
  const corpusChunks = await Promise.allSettled(
    jurisdictions.map((jur) => getRelevantCorpus([query_text], jur, 2))
  );
  const combinedEntries = corpusChunks
    .flatMap((r) => (r.status === "fulfilled" ? r.value : []))
    .slice(0, 8);
  const combinedCorpus = formatCorpusForPrompt(combinedEntries).slice(0, 4000);

  const anthropic = getAnthropicClient();
  const msg = await anthropic.messages.create({
    model: MODELS.SONNET,
    max_tokens: 2500,
    system: CROSS_REF_SYSTEM,
    messages: [{ role: "user", content: buildCrossRefPrompt(query_text, jurisdictions, combinedCorpus) }],
  });
  const raw = msg.content[0].type === "text" ? msg.content[0].text : "{}";
  let result: { results: unknown[]; summary: string; conflicts: string[] } = { results: [], summary: "", conflicts: [] };
  try {
    const parsed = JSON.parse(raw) as Partial<typeof result>;
    result = {
      results: Array.isArray(parsed.results) ? parsed.results : [],
      summary: parsed.summary ?? "",
      conflicts: Array.isArray(parsed.conflicts) ? parsed.conflicts : [],
    };
  } catch { /* keep default */ }

  const serviceClient = await createServiceClient();
  await serviceClient.from("cross_reference_queries").insert({
    organisation_id: profile.organisation_id,
    query_text,
    jurisdictions,
    result_json: result as unknown as Record<string, unknown>,
    created_by: user.id,
  });

  return NextResponse.json(result);
}
