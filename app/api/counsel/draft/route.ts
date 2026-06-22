import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { getAnthropicClient } from "@/lib/anthropic/client";
import { MODELS } from "@/lib/anthropic/utils";

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const contractId = new URL(request.url).searchParams.get("contract_id");
  if (!contractId) return NextResponse.json({ error: "contract_id required" }, { status: 400 });

  const { data: contract } = await supabase
    .from("contracts")
    .select("id")
    .eq("id", contractId)
    .eq("uploaded_by", user.id)
    .single();
  if (!contract) return NextResponse.json({ error: "Contract not found" }, { status: 404 });

  const service = await createServiceClient();
  const { data, error } = await service
    .from("negotiation_messages")
    .select("id, clause_index, direction, source_text, generated_text, tone, channel, created_at")
    .eq("contract_id", contractId)
    .order("created_at", { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const body = await request.json() as {
    contract_id?: string;
    clause_index?: number;
    clause?: string;
    suggestion?: string;
    incoming?: string;
    tone?: string;
    channel?: "email" | "whatsapp";
  };
  if (!body.contract_id || (!body.clause && !body.incoming)) {
    return NextResponse.json({ error: "Contract and clause or incoming message required" }, { status: 400 });
  }

  const { data: contract } = await supabase
    .from("contracts")
    .select("id, title, analysis_json")
    .eq("id", body.contract_id)
    .eq("uploaded_by", user.id)
    .single();
  if (!contract) return NextResponse.json({ error: "Contract not found" }, { status: 404 });

  const tone = body.tone?.slice(0, 120) || "polite, concise, commercially constructive";
  const channel = body.channel === "whatsapp" ? "whatsapp" : "email";
  const prompt = body.incoming
    ? `Draft a reply to the following counterparty message about ${contract.title}.
Keep the business relationship central. Identify what they are asking, whether it is within the agreement, what can be conceded, and what should be protected.
Approved contract positions: ${JSON.stringify(contract.analysis_json ?? {})}
Counterparty message: ${body.incoming}
Tone instruction: ${tone}

Return plain text with:
INTERNAL NOTE:
REPLY:`
    : `Draft a business-friendly negotiation message for this contract clause.
Clause: ${body.clause}
Requested replacement: ${body.suggestion ?? "Ask for a fairer mutual position."}
Tone instruction: ${tone}
The message must preserve the relationship, explain the request without legal theatre, and be ready to paste into email or WhatsApp. Return only the message.`;

  const response = await getAnthropicClient().messages.create({
    model: MODELS.SONNET,
    max_tokens: 1200,
    system: "You are Greenlit's Indian commercial-contract negotiation assistant. Be accurate, practical, polite, and business-first. Never claim legal certainty where it does not exist. Never send messages.",
    messages: [{ role: "user", content: prompt }],
  });
  const draft = response.content[0]?.type === "text" ? response.content[0].text.trim() : "";
  if (!draft) return NextResponse.json({ error: "Draft generation failed" }, { status: 500 });

  const service = await createServiceClient();
  const records = body.incoming
    ? [
        {
          contract_id: contract.id,
          clause_index: body.clause_index ?? null,
          direction: "incoming" as const,
          source_text: body.incoming,
          generated_text: null,
          tone: null,
          channel,
          created_by: user.id,
        },
        {
          contract_id: contract.id,
          clause_index: body.clause_index ?? null,
          direction: "draft" as const,
          source_text: null,
          generated_text: draft,
          tone,
          channel,
          created_by: user.id,
        },
      ]
    : [{
        contract_id: contract.id,
        clause_index: body.clause_index ?? null,
        direction: "draft" as const,
        source_text: body.clause ?? null,
        generated_text: draft,
        tone,
        channel,
        created_by: user.id,
      }];
  await service.from("negotiation_messages").insert(records as never);

  return NextResponse.json({ draft });
}
