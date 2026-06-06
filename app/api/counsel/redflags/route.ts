import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAnthropicClient } from "@/lib/anthropic/client";
import { MODELS } from "@/lib/anthropic/utils";
import { RED_FLAGS_SYSTEM, redFlagsUser } from "@/lib/anthropic/prompts/red-flags";

interface RedFlagItem {
  flag_type: string;
  clause_text: string;
  severity: "low" | "medium" | "high" | "critical";
  business_impact: string;
}

function safeParse<T>(text: string): T | null {
  try {
    const cleaned = text.replace(/^```json?\n?/m, "").replace(/\n?```$/m, "").trim();
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

  const body = await request.json() as { contract_id?: string };
  const { contract_id } = body;
  if (!contract_id) return NextResponse.json({ error: "contract_id required" }, { status: 400 });

  const { data: contract } = await supabase
    .from("contracts")
    .select("analysis_json")
    .eq("id", contract_id)
    .eq("organisation_id", profile.organisation_id)
    .single();

  if (!contract) return NextResponse.json({ error: "Contract not found" }, { status: 404 });
  if (!contract.analysis_json) {
    return NextResponse.json({ error: "Contract has not been analysed yet" }, { status: 422 });
  }

  const anthropic = getAnthropicClient();

  try {
    const resp = await anthropic.messages.create({
      model: MODELS.HAIKU,
      max_tokens: 600,
      system: RED_FLAGS_SYSTEM,
      messages: [{ role: "user", content: redFlagsUser(JSON.stringify(contract.analysis_json)) }],
    });
    const raw = resp.content[0].type === "text" ? resp.content[0].text : "";
    const result = safeParse<{ flags: RedFlagItem[] }>(raw);
    if (!result) return NextResponse.json({ error: "Failed to parse AI response" }, { status: 500 });
    return NextResponse.json({ flags: result.flags }, { status: 200 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Red flag scan failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
