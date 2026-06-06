import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { getAnthropicClient } from "@/lib/anthropic/client";
import { MODELS } from "@/lib/anthropic/utils";
import { REGULATED_SCAN_SYSTEM, buildRegulatedScanPrompt } from "@/lib/anthropic/prompts/regulated-scan";
import { getRelevantCorpus, formatCorpusForPrompt } from "@/lib/corpus/index";

export type RegulatedCategory = "finance" | "health" | "food" | "gaming" | "pharma" | "alcohol" | "crypto";

export interface RegulatedIssue {
  rule: string;
  severity: "high" | "medium" | "low";
  excerpt: string;
}

export interface RegulatedScanResult {
  compliant: boolean;
  issues: RegulatedIssue[];
  required_disclosures: string[];
}

const VALID_CATEGORIES = new Set<RegulatedCategory>(["finance", "health", "food", "gaming", "pharma", "alcohol", "crypto"]);

const CATEGORY_TOPICS: Record<RegulatedCategory, string[]> = {
  finance: ["SEBI", "financial advertising", "investment", "returns", "mutual fund"],
  health: ["NMC", "health claim", "medicine", "FSSAI", "treatment"],
  food: ["FSSAI", "food safety", "nutritional claim", "organic", "allergen"],
  gaming: ["gaming law", "online gaming", "real money gaming"],
  pharma: ["drug", "pharmacy", "prescription", "UCPMP"],
  alcohol: ["alcohol", "excise", "surrogate advertising"],
  crypto: ["cryptocurrency", "virtual digital asset", "SEBI VDA", "blockchain"],
};

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("organisation_id")
    .eq("id", user.id)
    .single();
  if (!profile?.organisation_id) return NextResponse.json({ error: "No organisation" }, { status: 403 });

  const body = await req.json() as { content?: string; category?: string; jurisdiction?: string };
  const content = (body.content ?? "").trim();
  const category = (body.category ?? "") as RegulatedCategory;
  const jurisdiction = (body.jurisdiction ?? "IN").trim();

  if (!content) return NextResponse.json({ error: "content is required" }, { status: 400 });
  if (!VALID_CATEGORIES.has(category)) return NextResponse.json({ error: "Invalid category" }, { status: 400 });

  // Fetch corpus before Sonnet — empty corpus must not break flow
  const topics = CATEGORY_TOPICS[category] ?? [];
  const corpusEntries = await getRelevantCorpus(topics, jurisdiction, 5);
  const corpusContext = formatCorpusForPrompt(corpusEntries);

  const anthropic = getAnthropicClient();
  const message = await anthropic.messages.create({
    model: MODELS.SONNET,
    max_tokens: 2000,
    system: REGULATED_SCAN_SYSTEM,
    messages: [{ role: "user", content: buildRegulatedScanPrompt(content, category, jurisdiction, corpusContext) }],
  });

  const raw = message.content[0].type === "text" ? message.content[0].text : "{}";
  let result: RegulatedScanResult = { compliant: true, issues: [], required_disclosures: [] };
  try {
    const parsed = JSON.parse(raw) as Partial<RegulatedScanResult>;
    result = {
      compliant: parsed.compliant ?? true,
      issues: Array.isArray(parsed.issues) ? parsed.issues : [],
      required_disclosures: Array.isArray(parsed.required_disclosures) ? parsed.required_disclosures : [],
    };
  } catch { /* keep default */ }

  const serviceClient = await createServiceClient();
  await serviceClient.from("content_advanced_scans").insert({
    organisation_id: profile.organisation_id,
    scan_type: "regulated",
    input_json: { content: content.slice(0, 500), category, jurisdiction },
    result_json: result as unknown as Record<string, unknown>,
    jurisdiction,
    created_by: user.id,
  });

  return NextResponse.json(result);
}
