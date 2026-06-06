// Model selection per GREENLIT_MASTER.md AI Usage Policy

export const MODELS = {
  HAIKU: "claude-haiku-4-5-20251001",
  SONNET: "claude-sonnet-4-6",
} as const;

export type ModelKey = keyof typeof MODELS;

type TaskType =
  | "classification"
  | "extraction"
  | "risk_score"
  | "keyword_extraction"
  | "message_safety"
  | "exclusivity_check"
  | "contract_analysis"
  | "negotiation_advice"
  | "sow_generation"
  | "notice_triage"
  | "crisis_analysis"
  | "clause_drafting"
  | "meeting_analysis";

const HAIKU_TASKS: TaskType[] = [
  "classification",
  "extraction",
  "risk_score",
  "keyword_extraction",
  "message_safety",
  "exclusivity_check",
];

const MAX_TOKENS: Record<TaskType, number> = {
  classification: 200,
  extraction: 500,
  risk_score: 200,
  keyword_extraction: 500,
  message_safety: 200,
  exclusivity_check: 500,
  contract_analysis: 2000,
  negotiation_advice: 2000,
  sow_generation: 4000,
  notice_triage: 2000,
  crisis_analysis: 2000,
  clause_drafting: 4000,
  meeting_analysis: 2000,
};

export function selectModel(task: TaskType): string {
  return HAIKU_TASKS.includes(task) ? MODELS.HAIKU : MODELS.SONNET;
}

export function getMaxTokens(task: TaskType): number {
  return MAX_TOKENS[task];
}

// Rough token estimator: ~4 chars per token
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

// Standard JSON output instruction appended to every user message
export const JSON_INSTRUCTION =
  "Respond ONLY with valid JSON. No markdown fences, no explanation.";

// Standard legal caveat for AI-generated analysis
export const LEGAL_CAVEAT =
  "⚠️ This analysis is AI-generated and not a substitute for qualified legal advice. " +
  "Review with your legal counsel before taking action.";
