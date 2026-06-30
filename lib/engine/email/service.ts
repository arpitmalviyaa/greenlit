import { createHash } from "crypto";
import { requireWorkspaceProfile, workspaceError } from "@/lib/engine/workspace/service";
import { buildDraftReply, emailJobPayload, extractNegotiationContext } from "./core";
import type { ProviderEmailMessage } from "./model";

export async function ingestEmailNegotiation(input: {
  message: ProviderEmailMessage;
  contractId?: string | null;
  dealRoomId?: string | null;
}) {
  const { service, profile } = await requireWorkspaceProfile("read");
  if (input.contractId) {
    const { data: contract, error } = await service
      .from("contracts")
      .select("id, title")
      .eq("id", input.contractId)
      .eq("organisation_id", profile.organisation_id)
      .single();
    if (error || !contract) throw workspaceError("Contract not found", 404);
  }
  const message = validateProviderMessage(input.message);
  const context = extractNegotiationContext(message);
  const draft = buildDraftReply(message, context);
  const participants = Array.from(new Set([message.from_address, ...message.to_addresses, ...(message.cc_addresses ?? [])]));

  const { data: thread, error: threadError } = await service
    .from("email_threads")
    .upsert({
      organisation_id: profile.organisation_id,
      provider: message.provider,
      provider_thread_id: message.provider_thread_id,
      subject: message.subject,
      participants,
      contract_id: input.contractId ?? null,
      deal_room_id: input.dealRoomId ?? null,
      last_message_at: message.sent_at,
      context,
    }, { onConflict: "organisation_id,provider,provider_thread_id" })
    .select("id, subject")
    .single();
  if (threadError || !thread) throw workspaceError(threadError?.message ?? "Email thread insert failed", 500);

  const bodySha256 = createHash("sha256").update(message.body_text).digest("hex");
  const { data: emailMessage, error: messageError } = await service
    .from("email_messages")
    .upsert({
      organisation_id: profile.organisation_id,
      thread_id: thread.id,
      provider_message_id: message.provider_message_id,
      direction: message.direction,
      from_address: message.from_address,
      to_addresses: message.to_addresses,
      cc_addresses: message.cc_addresses ?? [],
      sent_at: message.sent_at,
      subject: message.subject,
      body_text: message.body_text,
      body_sha256: bodySha256,
      headers: message.headers ?? {},
    }, { onConflict: "thread_id,provider_message_id" })
    .select("id")
    .single();
  if (messageError || !emailMessage) throw workspaceError(messageError?.message ?? "Email message insert failed", 500);

  const { data: draftReply, error: draftError } = await service
    .from("email_draft_replies")
    .insert({
      organisation_id: profile.organisation_id,
      thread_id: thread.id,
      contract_id: input.contractId ?? null,
      profile_id: profile.id,
      source_message_id: emailMessage.id,
      status: "draft",
      subject: draft.subject,
      body: draft.body,
      context: draft.context,
    })
    .select("id, subject, status")
    .single();
  if (draftError || !draftReply) throw workspaceError(draftError?.message ?? "Email draft insert failed", 500);

  const automation = await Promise.all([
    input.contractId
      ? service.from("timeline").insert({
          organisation_id: profile.organisation_id,
          contract_id: input.contractId,
          event_type: "email_negotiation_ingested",
          payload: { title: thread.subject, summary: context.summary, draft_reply_id: draftReply.id },
        })
      : Promise.resolve(),
    service.from("notifications").insert({
      organisation_id: profile.organisation_id,
      profile_id: profile.id,
      kind: "email_negotiation",
      body: `${thread.subject}: draft reply prepared`,
    }),
    service.from("background_jobs").insert({
      organisation_id: profile.organisation_id,
      kind: "email",
      payload: emailJobPayload({ threadId: thread.id, messageId: emailMessage.id, contractId: input.contractId }),
      idempotency_key: `email:draft:${emailMessage.id}`,
    }),
    service.from("negotiation_memory").insert({
      organisation_id: profile.organisation_id,
      contract_id: input.contractId ?? null,
      deal_room_id: input.dealRoomId ?? null,
      profile_id: profile.id,
      memory_type: "email_context",
      summary: context.summary,
      metadata: { thread_id: thread.id, message_id: emailMessage.id, mentioned_terms: context.mentioned_terms, risk_flags: context.risk_flags },
    }),
  ]);
  const automationError = automation.find((result) => result?.error)?.error;
  if (automationError) throw workspaceError(automationError.message, 500);

  return { thread, message: emailMessage, draft_reply: draftReply, context };
}

function validateProviderMessage(message: ProviderEmailMessage): ProviderEmailMessage {
  for (const [field, value] of Object.entries({
    provider: message.provider,
    provider_thread_id: message.provider_thread_id,
    provider_message_id: message.provider_message_id,
    direction: message.direction,
    subject: message.subject,
    from_address: message.from_address,
    sent_at: message.sent_at,
    body_text: message.body_text,
  })) {
    if (typeof value !== "string" || !value.trim()) throw workspaceError(`${field} is required`, 400);
  }
  if (!Array.isArray(message.to_addresses) || message.to_addresses.length === 0) throw workspaceError("to_addresses is required", 400);
  if (!["manual", "gmail", "outlook", "imap", "api"].includes(message.provider)) throw workspaceError("Unsupported email provider", 400);
  if (!["inbound", "outbound"].includes(message.direction)) throw workspaceError("Unsupported email direction", 400);
  if (Number.isNaN(Date.parse(message.sent_at))) throw workspaceError("sent_at must be an ISO date", 400);
  return {
    ...message,
    subject: message.subject.slice(0, 300),
    body_text: message.body_text.slice(0, 100_000),
    to_addresses: message.to_addresses.slice(0, 50),
    cc_addresses: (message.cc_addresses ?? []).slice(0, 50),
  };
}
