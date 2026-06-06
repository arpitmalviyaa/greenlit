export const PLATFORM_SCAN_SYSTEM = `You are a platform policy compliance expert. You know the content policies for Instagram, YouTube, Twitter/X, LinkedIn, and TikTok in depth.`;

export function buildPlatformScanPrompt(content: string, platforms: string[], jurisdiction: string): string {
  const platformList = platforms.join(", ");

  const platformPolicies: Record<string, string> = {
    instagram: "Community Guidelines: no hate speech, nudity, graphic violence, misinformation, regulated goods promotion without disclosure, spam/fake engagement, intellectual property violations, fake accounts. Branded content must use Paid Partnership label. Financial services require disclaimers.",
    youtube: "Community Guidelines: no harmful/dangerous content, hate speech, violent extremism, child safety violations, harassment, spam, misleading metadata. Monetised videos need ad-friendly content. Sponsored content needs disclosure in description and verbally.",
    twitter: "Rules: no abusive behaviour, hateful conduct, violent speech, platform manipulation, synthetic media without label, illegal goods. Promoted content needs #ad or #sponsored. Sensitive media must be labeled.",
    linkedin: "Professional Community Policies: no misinformation, harassment, spam, discriminatory content, illegal practices promotion. B2B claims must be substantiated. No fake engagement.",
    tiktok: "Community Guidelines: no dangerous activities, hate speech, violent extremism, adult content, misinformation, scams, intellectual property violations. Branded content requires disclosure. For IN jurisdiction: ASCI influencer guidelines apply for sponsored content.",
  };

  const relevantPolicies = platforms
    .map((p) => `${p.toUpperCase()}: ${platformPolicies[p] ?? "General platform community standards apply."}`)
    .join("\n\n");

  return `Scan the following content for compliance with the policies of these platforms: ${platformList}.
Jurisdiction context: ${jurisdiction}.

Platform Policy Reference:
${relevantPolicies}

For each platform, return:
- platform: platform name
- verdict: "safe" | "caution" | "risk"
- flags: array of specific policy violations or warnings (empty array if none)

Content:
"""
${content}
"""

Return ONLY a JSON object: { "results": [ { "platform": string, "verdict": "safe"|"caution"|"risk", "flags": string[] } ] }
Respond ONLY with valid JSON. No markdown fences, no explanation.`;
}
