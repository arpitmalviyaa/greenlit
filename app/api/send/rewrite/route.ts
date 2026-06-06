import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { getAnthropicClient } from "@/lib/anthropic/client";
import { MODELS } from "@/lib/anthropic/utils";
import { SEND_REWRITE_SYSTEM, buildSendRewritePrompt } from "@/lib/anthropic/prompts/send-rewrite";

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

  const body = await req.json() as { send_scan_id?: string; rewrite_goal?: string };
  const { send_scan_id, rewrite_goal = "safer" } = body;
  if (!send_scan_id) return NextResponse.json({ error: "send_scan_id is required" }, { status: 400 });

  const { data: scan } = await supabase
    .from("send_scans")
    .select("content, scan_result_json, organisation_id")
    .eq("id", send_scan_id)
    .single();
  if (!scan || scan.organisation_id !== profile.organisation_id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const scanResult = scan.scan_result_json as { issues?: Array<{ type: string; explanation: string }> } | null;
  const issuesSummary = (scanResult?.issues ?? [])
    .map((i) => `- [${i.type}] ${i.explanation}`)
    .join("\n") || "No specific issues identified.";

  const anthropic = getAnthropicClient();
  const msg = await anthropic.messages.create({
    model: MODELS.HAIKU,
    max_tokens: 800,
    system: SEND_REWRITE_SYSTEM,
    messages: [{ role: "user", content: buildSendRewritePrompt(scan.content, rewrite_goal, issuesSummary) }],
  });
  const raw = msg.content[0].type === "text" ? msg.content[0].text : "{}";
  let result = { rewritten_content: "", changes_made: [] as string[], risk_delta: "" };
  try {
    const parsed = JSON.parse(raw) as Partial<typeof result>;
    result = {
      rewritten_content: parsed.rewritten_content ?? "",
      changes_made: Array.isArray(parsed.changes_made) ? parsed.changes_made : [],
      risk_delta: parsed.risk_delta ?? "",
    };
  } catch { /* keep default */ }

  const serviceClient = await createServiceClient();
  await serviceClient.from("send_scans")
    .update({ rewrite_json: { goal: rewrite_goal, ...result } as unknown as Record<string, unknown> })
    .eq("id", send_scan_id);

  return NextResponse.json(result);
}
