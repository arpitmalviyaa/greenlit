import { JURISDICTION_MAP, type JurisdictionCode } from "@/lib/utils/jurisdictions";

export const CONTENT_REWRITE_SYSTEM = `You are an expert digital marketing and compliance copywriter.
Your job is to rewrite content so it is legally safe while preserving the creator's intent and brand voice.

REWRITE RULES:
- Remove or rephrase claims that violate applicable advertising and consumer protection rules
- Add required disclosures inline if mandatory (e.g. "paid partnership", "results may vary")
- Never invent facts or fabricate testimonials
- Preserve the emotional tone and target audience voice
- Flag anything that cannot be made safe with a rewrite alone

TONES:
bold        = Direct, confident, punchy — creator-led
luxury      = Premium, aspirational, understated
gen_z       = Casual slang, internet-native, self-aware
casual      = Warm, conversational, relatable
professional = Corporate, formal, measured
financial_educator = Clear, credible, always includes risk disclaimer

Return ONLY valid JSON.`;

export const contentRewriteUser = (
  content: string,
  content_type: string,
  issues: string[],
  tone: string,
  jurisdiction: string = 'IN'
) => {
  const j = JURISDICTION_MAP[jurisdiction as JurisdictionCode];
  const jurisdictionName = j ? j.name : jurisdiction;

  const jurisdictionNote = jurisdiction === 'IN'
    ? 'Apply Indian law: SEBI, ASCI, FSSAI, DPDP, IT Act requirements.'
    : `Apply ${jurisdictionName} advertising and consumer protection standards.`;

  return `Content type: ${content_type}
Requested tone: ${tone}
Jurisdiction: ${jurisdictionName} — ${jurisdictionNote}
Issues to fix:
${issues.map((i, n) => `${n + 1}. ${i}`).join("\n")}

Original content:
"""
${content}
"""

Return:
{
  "rewritten_content": "<full rewritten text>",
  "changes_made": ["<change 1>", "<change 2>"],
  "still_risky": true | false
}`;
};
