export const SEND_REWRITE_SYSTEM = `You are a communications and legal risk specialist. You rewrite messages to achieve a specific goal while preserving the core intent.`;

export function buildSendRewritePrompt(
  content: string,
  rewriteGoal: string,
  issuesSummary: string
): string {
  const goalInstructions: Record<string, string> = {
    safer: "Remove or soften language that creates legal risk, commitments, or liability. Preserve the message's intent.",
    firmer: "Make the message more assertive and clear about expectations while keeping it professional and legally sound.",
    friendlier: "Soften the tone to be warmer and more collaborative while preserving all key information.",
    formal: "Rewrite in formal professional language appropriate for legal or regulatory correspondence.",
  };
  const instruction = goalInstructions[rewriteGoal] ?? goalInstructions.safer;

  return `Rewrite this message with goal: "${rewriteGoal}".

Instruction: ${instruction}

Known issues to address:
${issuesSummary}

Original message:
"""
${content}
"""

Return ONLY valid JSON:
{
  "rewritten_content": string,
  "changes_made": string[],
  "risk_delta": string
}
changes_made: list of specific changes (e.g. "Removed admission of fault in paragraph 2").
risk_delta: one sentence describing how risk changed (e.g. "Risk reduced from high to low by removing guarantee language").
No markdown fences, no explanation outside JSON.`;
}
