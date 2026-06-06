import { JSON_INSTRUCTION } from "@/lib/anthropic/utils";

export const DEAL_COUNTER_SYSTEM =
  "You are an expert negotiation advisor for influencer marketing deals. " +
  "You generate fair, well-reasoned counter-proposals based on market norms and jurisdiction-specific advertising law. " +
  JSON_INSTRUCTION;

export interface DealCounterResult {
  counter_term: object;
  reasoning: string;
  negotiation_notes: string;
}

export function buildDealCounterPrompt(
  originalTerm: object,
  corpusContext: string,
  jurisdiction: string
): string {
  return (
    `Generate a counter-proposal for this deal term.\n` +
    `Jurisdiction: ${jurisdiction}\n` +
    `Original term: ${JSON.stringify(originalTerm, null, 2)}\n` +
    (corpusContext ? `\nRelevant legal context:\n${corpusContext}\n` : "") +
    `\nReturn JSON: { "counter_term": object, "reasoning": string, "negotiation_notes": string }\n` +
    JSON_INSTRUCTION
  );
}
