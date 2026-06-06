import { JSON_INSTRUCTION } from "@/lib/anthropic/utils";

export const WHITELISTING_ANALYSE_SYSTEM = `You are an influencer marketing compliance expert specialising in content whitelisting and advertising rights. You analyse whitelisting requests for legal compliance, creator protection, and platform policy alignment. You know Indian advertising regulations (ASCI, Consumer Protection Act), global platform policies, and international ad law. ${JSON_INSTRUCTION}`;

export function buildWhitelistingAnalysePrompt(
  creatorId: string,
  brandName: string,
  platform: string,
  contentDescription: string,
  requestedRights: string[],
  jurisdiction: string,
  corpusContext: string
): string {
  return `Analyse this whitelisting request for compliance and creator protection.

Brand: ${brandName}
Platform: ${platform}
Jurisdiction: ${jurisdiction}
Content Description: ${contentDescription}
Requested Rights: ${requestedRights.join(", ")}

${corpusContext ? `Relevant Legal Context:\n${corpusContext}\n` : ""}

Evaluate:
1. Scope legality — are these rights legally permissible for the jurisdiction?
2. Platform policy alignment — do the rights match ${platform} policies?
3. Creator protection — what rights risks does the creator face?
4. Missing clauses — what standard protections are absent?
5. Jurisdiction-specific ad law — any ASCI/FTC/ASA requirements?

Return JSON:
{
  "verdict": "string (1-2 sentences overall assessment)",
  "risks": ["string"],
  "missing_clauses": ["string"],
  "recommended_amendments": ["string"],
  "compliance_notes": "string"
}`;
}
