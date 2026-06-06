// Haiku prompt — decode a single clause into plain English.
// Max tokens: 400

export const CLAUSE_DECODE_SYSTEM = `You are a legal plain-language translator specialising in Indian influencer marketing contracts.
Given a clause, return a JSON object explaining it in plain English for a creator or agency.
Return ONLY valid JSON. No prose, no markdown fences.`;

export const clauseDecodeUser = (clauseText: string) => `
Clause:
${clauseText.slice(0, 2000)}

Return this JSON structure:
{
  "plain_english": "<What this clause says in simple language, 1-3 sentences>",
  "what_it_means_for_you": "<Practical impact on the creator or agency, 1-2 sentences>",
  "risk_level": "low" | "medium" | "high"
}`;
