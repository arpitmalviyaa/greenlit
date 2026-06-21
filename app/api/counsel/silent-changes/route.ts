import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAnthropicClient } from "@/lib/anthropic/client";
import { MODELS } from "@/lib/anthropic/utils";
import { SILENT_CHANGES_SYSTEM, silentChangesUser } from "@/lib/anthropic/prompts/silent-changes";

interface SilentChange {
  original_wording: string;
  new_wording: string;
  what_changed: string;
  why_it_matters: string;
}

function safeParse<T>(text: string): T | null {
  try {
    const cleaned = text.trim().replace(/^```json?\s*/i, "").replace(/\s*```$/, "").trim();
    return JSON.parse(cleaned) as T;
  } catch {
    return null;
  }
}

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

  const body = await request.json() as { contract_id_a?: string; contract_id_b?: string };
  const { contract_id_a, contract_id_b } = body;
  if (!contract_id_a || !contract_id_b) {
    return NextResponse.json({ error: "contract_id_a and contract_id_b required" }, { status: 400 });
  }
  if (contract_id_a === contract_id_b) {
    return NextResponse.json({ error: "Select two different contracts" }, { status: 400 });
  }

  const [{ data: contractA }, { data: contractB }] = await Promise.all([
    supabase.from("contracts").select("raw_text").eq("id", contract_id_a).eq("organisation_id", profile.organisation_id).single(),
    supabase.from("contracts").select("raw_text").eq("id", contract_id_b).eq("organisation_id", profile.organisation_id).single(),
  ]);

  if (!contractA || !contractB) return NextResponse.json({ error: "One or both contracts not found" }, { status: 404 });
  if (!contractA.raw_text || !contractB.raw_text) {
    return NextResponse.json({ error: "Both contracts must have extracted text" }, { status: 422 });
  }

  const anthropic = getAnthropicClient();

  try {
    const resp = await anthropic.messages.create({
      model: MODELS.HAIKU,
      max_tokens: 1000,
      system: SILENT_CHANGES_SYSTEM,
      messages: [{ role: "user", content: silentChangesUser(contractA.raw_text, contractB.raw_text) }],
    });
    const raw = resp.content[0].type === "text" ? resp.content[0].text : "";
    const result = safeParse<{ changes: SilentChange[] }>(raw);
    if (!result) return NextResponse.json({ error: "Failed to parse AI response" }, { status: 500 });
    return NextResponse.json({ changes: result.changes }, { status: 200 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Silent changes scan failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
