// Haiku prompt — detect subtle wording changes between two contracts.
// Max tokens: 600

export const SILENT_CHANGES_SYSTEM = `You are a legal diff specialist for Indian influencer marketing contracts.
Given two contract texts, identify subtle wording changes that alter legal meaning.
Return ONLY valid JSON. No prose, no markdown fences.`;

export const silentChangesUser = (rawTextA: string, rawTextB: string) => `
Contract Version A (first 6000 chars):
${rawTextA.slice(0, 6000)}

Contract Version B (first 6000 chars):
${rawTextB.slice(0, 6000)}

Find sentences or phrases that changed between versions where the change affects legal meaning, timelines, or obligations.
Focus on: payment terms, approval triggers, content removal clauses, IP grant scope, liability caps.

Return this JSON structure:
{
  "changes": [
    {
      "original_wording": "<exact or paraphrased wording from Version A>",
      "new_wording": "<exact or paraphrased wording from Version B>",
      "what_changed": "<one sentence: what specifically changed>",
      "why_it_matters": "<one sentence: what this means for you legally or financially>"
    }
  ]
}

If no silent changes found, return { "changes": [] }.`;
