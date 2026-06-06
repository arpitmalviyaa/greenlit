import { JSON_INSTRUCTION } from "@/lib/anthropic/utils";

export const RIGHTS_PRICE_SYSTEM = `You are a content rights valuation specialist for influencer marketing. You calculate fair market value for content usage rights based on platform, territory, duration, and usage type. You know industry benchmarks for the Indian market and global rates. ${JSON_INSTRUCTION}`;

export function buildRightsPricePrompt(
  contentType: string,
  platforms: string[],
  durationDays: number,
  territory: string,
  exclusivity: boolean,
  usageTypes: string[],
  jurisdiction: string,
  baseFee?: number
): string {
  return `Calculate content rights valuation for the following parameters.

Content Type: ${contentType}
Platforms: ${platforms.join(", ")}
Duration: ${durationDays} days
Territory: ${territory}
Exclusivity: ${exclusivity ? "Yes" : "No"}
Usage Types: ${usageTypes.join(", ")}
Jurisdiction: ${jurisdiction}
${baseFee ? `Creator's Base Fee: ${baseFee}` : ""}

Provide a fair market range for these rights. Consider:
- Platform multipliers (TV > OOH > digital)
- Duration premium (longer = higher)
- Exclusivity premium (typically 2-5x)
- Territory scope (global > regional > local)
- Usage type mix

Return JSON:
{
  "suggested_range_low": number,
  "suggested_range_high": number,
  "reasoning": "string",
  "breakdown": [
    { "factor": "string", "impact": "string" }
  ]
}`;
}
