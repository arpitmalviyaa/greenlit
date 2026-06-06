import { JSON_INSTRUCTION } from "@/lib/anthropic/utils";

export const APPROVAL_PRESCREEN_SYSTEM =
  "You are a compliance pre-screener for influencer marketing content. " +
  "You quickly scan submissions for obvious compliance issues such as undisclosed sponsorships, " +
  "banned claims, misleading statements, and jurisdiction-specific advertising law violations. " +
  JSON_INSTRUCTION;

export interface ApprovalPrescreenResult {
  passed: boolean;
  issues: string[];
}

export function buildApprovalPrescreenPrompt(
  title: string,
  description: string,
  jurisdiction: string
): string {
  return (
    `Pre-screen this approval submission for obvious compliance issues.\n` +
    `Title: ${title}\n` +
    `Description: ${description || "(none)"}\n` +
    `Jurisdiction: ${jurisdiction}\n\n` +
    `Return JSON: { "passed": boolean, "issues": string[] }\n` +
    JSON_INSTRUCTION
  );
}
