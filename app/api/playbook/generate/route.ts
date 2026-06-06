import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAnthropicClient } from "@/lib/anthropic/client";
import { MODELS } from "@/lib/anthropic/utils";
import { PLAYBOOK_GENERATE_SYSTEM, buildPlaybookGeneratePrompt } from "@/lib/anthropic/prompts/playbook-generate";

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase.from("profiles").select("organisation_id, role").eq("id", user.id).single();
  if (!profile?.organisation_id) return NextResponse.json({ error: "No organisation" }, { status: 403 });
  if (profile.role !== "agency_admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json() as { context?: string; jurisdiction?: string };
  const context = (body.context ?? "").trim();
  const jurisdiction = body.jurisdiction ?? "IN";
  if (!context) return NextResponse.json({ error: "context is required" }, { status: 400 });

  const anthropic = getAnthropicClient();
  const msg = await anthropic.messages.create({
    model: MODELS.SONNET,
    max_tokens: 2000,
    system: PLAYBOOK_GENERATE_SYSTEM,
    messages: [{ role: "user", content: buildPlaybookGeneratePrompt(context, jurisdiction) }],
  });
  const raw = msg.content[0].type === "text" ? msg.content[0].text : "{}";
  let result: { suggestions: unknown[] } = { suggestions: [] };
  try { result = JSON.parse(raw) as typeof result; } catch { /* keep default */ }

  return NextResponse.json(result);
}
