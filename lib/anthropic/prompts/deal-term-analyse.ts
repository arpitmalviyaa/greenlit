import { JSON_INSTRUCTION } from "@/lib/anthropic/utils";

export const DEAL_TERM_ANALYSE_SYSTEM =
  "You are an expert in influencer marketing deal terms, brand contracts, and advertising law. " +
  "You analyse deal terms for fairness, market rate alignment, legal risk, and jurisdiction-specific considerations. " +
  JSON_INSTRUCTION;

export interface DealTermAnalysis {
  assessment: string;
  risk: "high" | "medium" | "low";
  counter_suggestions: string[];
  red_flags: string[];
}

export function buildDealTermAnalysePrompt(
  termJson: object,
  jurisdiction: string
): string {
  return (
    `Analyse this deal term for fairness, market rate, and legal risk.\n` +
    `Jurisdiction: ${jurisdiction}\n` +
    `Term: ${JSON.stringify(termJson, null, 2)}\n\n` +
    `Return JSON: { "assessment": string, "risk": "high"|"medium"|"low", "counter_suggestions": string[], "red_flags": string[] }\n` +
    JSON_INSTRUCTION
  );
}
