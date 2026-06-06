import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { getAnthropicClient } from "@/lib/anthropic/client";
import { MODELS } from "@/lib/anthropic/utils";
import {
  APPROVAL_PRESCREEN_SYSTEM,
  buildApprovalPrescreenPrompt,
  type ApprovalPrescreenResult,
} from "@/lib/anthropic/prompts/approval-prescreen";

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

  const body = await req.json() as {
    sow_id?: string;
    deliverable_id?: string;
    title: string;
    description?: string;
    content_url?: string;
    jurisdiction?: string;
  };

  if (!body.title) return NextResponse.json({ error: "title is required" }, { status: 400 });

  const jurisdiction = body.jurisdiction ?? "IN";

  // Haiku pre-screen
  const anthropic = getAnthropicClient();
  const msg = await anthropic.messages.create({
    model: MODELS.HAIKU,
    max_tokens: 500,
    system: APPROVAL_PRESCREEN_SYSTEM,
    messages: [{
      role: "user",
      content: buildApprovalPrescreenPrompt(body.title, body.description ?? "", jurisdiction),
    }],
  });

  let pre_screen: ApprovalPrescreenResult = { passed: true, issues: [] };
  try {
    const raw = msg.content[0].type === "text" ? msg.content[0].text : "{}";
    pre_screen = JSON.parse(raw) as ApprovalPrescreenResult;
  } catch { /* keep default */ }

  // Save to approval_requests
  const service = await createServiceClient();
  const { data: approval, error } = await service
    .from("approval_requests")
    .insert({
      organisation_id: profile.organisation_id,
      submitted_by: user.id,
      sow_id: body.sow_id ?? null,
      deliverable_id: body.deliverable_id ?? null,
      title: body.title,
      description: body.description ?? null,
      content_url: body.content_url ?? null,
      status: "pending",
    })
    .select("id")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ pre_screen, approval_request_id: approval?.id ?? null });
}
