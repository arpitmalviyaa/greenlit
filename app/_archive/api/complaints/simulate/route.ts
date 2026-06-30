import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { getAnthropicClient } from "@/lib/anthropic/client";
import { MODELS } from "@/lib/anthropic/utils";
import { COMPLAINT_SIMULATE_SYSTEM, buildComplaintSimulatePrompt } from "@/lib/anthropic/prompts/complaint-simulate";

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase.from("profiles").select("organisation_id").eq("id", user.id).single();
  if (!profile?.organisation_id) return NextResponse.json({ error: "No organisation" }, { status: 403 });

  const body = await req.json() as {
    content_or_practice?: string;
    complaint_body?: string;
    jurisdiction?: string;
  };
  const content_or_practice = (body.content_or_practice ?? "").trim();
  const complaint_body = (body.complaint_body ?? "ASCI") as "ASCI" | "SEBI" | "MCA" | "consumer_court" | "FTC" | "ASA" | "ICO" | "other";
  const jurisdiction = body.jurisdiction ?? "IN";
  if (!content_or_practice) return NextResponse.json({ error: "content_or_practice is required" }, { status: 400 });

  const anthropic = getAnthropicClient();
  const msg = await anthropic.messages.create({
    model: MODELS.HAIKU,
    max_tokens: 800,
    system: COMPLAINT_SIMULATE_SYSTEM,
    messages: [{ role: "user", content: buildComplaintSimulatePrompt(content_or_practice, complaint_body, jurisdiction) }],
  });
  const raw = msg.content[0].type === "text" ? msg.content[0].text : "{}";
  let result: { grounds: string[]; likely_outcome: string; case_strength: string; pre_emption_steps: string[] } = {
    grounds: [], likely_outcome: "", case_strength: "weak", pre_emption_steps: [],
  };
  try {
    const parsed = JSON.parse(raw) as Partial<typeof result>;
    result = {
      grounds: Array.isArray(parsed.grounds) ? parsed.grounds : [],
      likely_outcome: parsed.likely_outcome ?? "",
      case_strength: parsed.case_strength ?? "weak",
      pre_emption_steps: Array.isArray(parsed.pre_emption_steps) ? parsed.pre_emption_steps : [],
    };
  } catch { /* keep default */ }

  const serviceClient = await createServiceClient();
  await serviceClient.from("complaint_simulations").insert({
    organisation_id: profile.organisation_id,
    content_or_practice,
    complaint_body,
    jurisdiction,
    simulation_json: result as unknown as Record<string, unknown>,
    created_by: user.id,
  });

  return NextResponse.json(result);
}
