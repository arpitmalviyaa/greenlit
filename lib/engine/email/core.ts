import type { DraftReply, NegotiationContext, ProviderEmailMessage } from "./model";

const TERM_PATTERNS: Array<[string, RegExp]> = [
  ["usage_rights", /\busage|license|rights?\b/i],
  ["payment", /\bpayment|invoice|fee|payable|net\s*\d+\b/i],
  ["exclusivity", /\bexclusive|exclusivity\b/i],
  ["termination", /\bterminate|termination|cancel\b/i],
  ["deliverables", /\bdeliverable|post|reel|story|video\b/i],
  ["revision", /\brevision|edit|approval\b/i],
];
const RISK_PATTERNS: Array<[RegExp, string]> = [
  [/\bperpetual\b/i, "perpetual_rights"],
  [/\birrevocable\b/i, "irrevocable_rights"],
  [/\bwithout approval\b/i, "approval_gap"],
  [/\bnet\s*(?:60|90|120)\b/i, "slow_payment"],
];

export function extractNegotiationContext(message: ProviderEmailMessage): NegotiationContext {
  const text = `${message.subject}\n${message.body_text}`;
  const mentioned_terms = TERM_PATTERNS.filter(([, pattern]) => pattern.test(text)).map(([term]) => term);
  const money = matches(text, /(?:[$₹€£]\s?\d[\d,]*(?:\.\d{2})?|\b\d[\d,]*\s?(?:usd|inr|eur|gbp)\b)/gi);
  const dates = matches(text, /\b(?:\d{1,2}[/-]\d{1,2}[/-]\d{2,4}|\d{1,2}\s+(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+\d{4})\b/gi);
  const risk_flags = RISK_PATTERNS.filter(([pattern]) => pattern.test(text)).map(([, flag]) => flag);
  return {
    summary: summarize(text),
    mentioned_terms,
    dates,
    money,
    risk_flags,
  };
}

export function buildDraftReply(message: ProviderEmailMessage, context = extractNegotiationContext(message)): DraftReply {
  const riskLine = context.risk_flags.length
    ? `I want to tighten ${context.risk_flags.join(", ")} before we agree.`
    : "I want to confirm the commercial and usage details before we agree.";
  return {
    subject: message.subject.toLowerCase().startsWith("re:") ? message.subject : `Re: ${message.subject}`,
    body: [
      "Thanks for sending this through.",
      "",
      riskLine,
      "Can you confirm the exact scope, timeline, payment date, and any exclusivity before I mark this as acceptable?",
      "",
      "Best,",
    ].join("\n"),
    context,
  };
}

export function emailJobPayload(input: { threadId: string; messageId: string; contractId?: string | null }) {
  return {
    thread_id: input.threadId,
    message_id: input.messageId,
    contract_id: input.contractId ?? null,
    action: "draft_reply",
  };
}

function matches(text: string, pattern: RegExp): string[] {
  return Array.from(new Set(Array.from(text.matchAll(pattern)).map((match) => match[0])));
}

function summarize(text: string): string {
  const cleaned = text.replace(/\s+/g, " ").trim();
  // ponytail: first-sentence heuristic; upgrade path is an LLM-backed summary once an email provider is live.
  return cleaned.split(/(?<=[.!?])\s+/)[0]?.slice(0, 240) || "Email negotiation message received.";
}
