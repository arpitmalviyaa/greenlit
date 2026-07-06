import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { MODELS } from "@/lib/anthropic/utils";
import { AIOutputError, callStructured } from "@/lib/anthropic/structured";
import { RED_FLAGS_SYSTEM, RedFlagsSchema, redFlagsUser } from "@/lib/anthropic/prompts/red-flags";

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

  try {
    const result = await callStructured({
      feature: "counsel.redflags",
      promptVersion: "v2",
      model: MODELS.HAIKU,
      maxTokens: 2000,
      system: RED_FLAGS_SYSTEM,
      user: redFlagsUser(JSON.stringify(contract.analysis_json)),
      schema: RedFlagsSchema,
      toolName: "report_red_flags",
    });
    return NextResponse.json({ flags: result.flags }, { status: 200 });
  } catch (err) {
    if (err instanceof AIOutputError) {
      return NextResponse.json(
        { error: "Red flag scan could not produce a valid result. Please retry.", code: err.code },
        { status: 502 }
      );
    }
    return NextResponse.json(
      { error: "Red flag scan failed", code: "AI_REQUEST_FAILED" },
      { status: 502 }
    );
  }
}
