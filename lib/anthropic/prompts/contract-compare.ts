// Two-pass prompts for contract version comparison.
// Haiku pass: extract clause list from each contract. Max tokens: 800
// Sonnet pass: compare the two clause lists. Max tokens: 2000

export const COMPARE_EXTRACT_SYSTEM = `You are a legal document parser specialising in Indian influencer marketing contracts.
Extract every distinct clause from the contract text.
Return ONLY valid JSON. No prose, no markdown fences. Truncate each clause to 250 characters.`;

export const compareExtractUser = (rawText: string, label: "A" | "B") => `
Contract ${label} text:
${rawText.slice(0, 10000)}

Return this JSON structure:
{
  "label": "${label}",
  "clauses": [
    {
      "type": "payment" | "ip_rights" | "termination" | "exclusivity" | "indemnity" | "moral_rights" | "deliverables" | "confidentiality" | "dispute" | "other",
      "text": "<clause text, max 250 chars>"
    }
  ]
}`;

export const COMPARE_ANALYSE_SYSTEM = `You are a senior contract lawyer specialising in Indian influencer marketing law.
Given two extracted clause lists (Version A and Version B of the same contract), compare them and identify changes.
Return ONLY valid JSON. No prose, no markdown fences.`;

export const compareAnalyseUser = (clauseJsonA: string, clauseJsonB: string) => `
Version A clauses:
${clauseJsonA}

Version B clauses:
${clauseJsonB}

Return this JSON structure:
{
  "silent_changes": [
    { "clause_type": "<type>", "version_a": "<text>", "version_b": "<text>", "risk_change": "better" | "worse" | "neutral" }
  ],
  "worsened_clauses": [
    { "clause_type": "<type>", "explanation": "<what got worse and why>" }
  ],
  "removed_protections": [
    { "clause_type": "<type>", "why_it_mattered": "<why the removed clause protected you>" }
  ],
  "new_obligations": [
    { "clause_type": "<type>", "explanation": "<new obligation and its impact>" }
  ],
  "payment_term_changes": ["<plain English description of any payment term changes>"],
  "overall_verdict": "<1-2 sentence summary of whether Version B is better or worse for the creator/agency>"
}`;
