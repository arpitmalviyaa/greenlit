import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { CHECKERS, CHECKER_MAP } from "@/lib/utils/checkers";
import { getAnthropicClient } from "@/lib/anthropic/client";
import { MODELS } from "@/lib/anthropic/utils";
import { getRelevantCorpus, formatCorpusForPrompt } from "@/lib/corpus/index";
import { JURISDICTION_MAP } from "@/lib/utils/jurisdictions";

const VPS_BASE = "http://100.90.36.128:8765";
const VPS_TIMEOUT_MS = 5000;

type Severity = "low" | "medium" | "high" | "critical";
type CheckerVerdict = "greenlit" | "caution" | "blocked";

interface FlaggedIssue {
  issue: string;
  legal_basis: string;
  severity: Severity;
}

interface CheckerResult {
  checker_id: string;
  checker_name: string;
  verdict: CheckerVerdict;
  risk_score: number;
  flagged_issues: FlaggedIssue[];
  safe_to_publish: boolean;
  error?: string;
}

interface ScanOutput {
  overall_verdict: CheckerVerdict;
  overall_risk_score: number;
  results: CheckerResult[];
  top_issues: FlaggedIssue[];
  requires_lawyer: boolean;
}

const SEVERITY_RANK: Record<Severity, number> = {
  low: 1,
  medium: 2,
  high: 3,
  critical: 4,
};

function verdictFromScore(score: number): CheckerVerdict {
  if (score >= 70) return "blocked";
  if (score >= 35) return "caution";
  return "greenlit";
}

async function callChecker(
  checkerId: string,
  content: string,
  content_type: string
): Promise<CheckerResult> {
  const meta = CHECKER_MAP[checkerId];
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), VPS_TIMEOUT_MS);

  try {
    const resp = await fetch(`${VPS_BASE}/check/${checkerId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content, content_type }),
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (!resp.ok) {
      throw new Error(`VPS returned ${resp.status}`);
    }

    const data = await resp.json() as Partial<CheckerResult>;
    const risk_score = Math.min(100, Math.max(0, Math.round(Number(data.risk_score ?? 0))));
    const flagged_issues = Array.isArray(data.flagged_issues) ? data.flagged_issues : [];
    const verdict = (data.verdict as CheckerVerdict) ?? verdictFromScore(risk_score);

    return {
      checker_id: checkerId,
      checker_name: meta.name,
      verdict,
      risk_score,
      flagged_issues,
      safe_to_publish: verdict === "greenlit",
    };
  } catch (err) {
    clearTimeout(timer);
    const isTimeout = err instanceof Error && err.name === "AbortError";
    return {
      checker_id: checkerId,
      checker_name: meta.name,
      verdict: "caution",
      risk_score: 0,
      flagged_issues: [],
      safe_to_publish: true,
      error: isTimeout ? "Checker timed out" : "VPS unreachable",
    };
  }
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("organisation_id")
    .eq("id", user.id)
    .single();

  if (!profile?.organisation_id) {
    return NextResponse.json({ error: "No organisation found" }, { status: 403 });
  }

  const body = await request.json() as {
    content?: string;
    content_type?: string;
    campaign_id?: string;
    run_all?: boolean;
    checker_ids?: string[];
    jurisdiction?: string;
  };

  const { content, content_type, campaign_id, run_all, checker_ids, jurisdiction = "IN" } = body;
  if (!content || !content_type) {
    return NextResponse.json({ error: "content and content_type required" }, { status: 400 });
  }

  // Non-IN jurisdictions: skip VPS checkers, use Sonnet corpus-based analysis instead
  const isNonIN = jurisdiction !== "IN";

  let output: ScanOutput;
  let checkerIds: string[] = [];

  if (isNonIN) {
    const jDef = JURISDICTION_MAP[jurisdiction as keyof typeof JURISDICTION_MAP];
    const jurisdictionName = jDef ? jDef.name : jurisdiction;

    // Best-effort corpus lookup
    const corpusEntries = await getRelevantCorpus(
      [content_type, "advertising", "influencer", "marketing"],
      jurisdiction,
      5
    );
    const corpus_context = formatCorpusForPrompt(corpusEntries);

    let sonnetResult: { risk_score: number; verdict: CheckerVerdict; issues: FlaggedIssue[] } = {
      risk_score: 0,
      verdict: "greenlit",
      issues: [],
    };

    try {
      const anthropic = getAnthropicClient();
      const resp = await anthropic.messages.create({
        model: MODELS.SONNET,
        max_tokens: 800,
        system: `You are a senior advertising compliance lawyer. Analyse the content for legal risk in ${jurisdictionName}.${corpus_context ? `\n\nRelevant legal context:\n${corpus_context}` : ""}\nReturn ONLY valid JSON.`,
        messages: [{
          role: "user",
          content: `Content type: ${content_type}\nContent:\n"""\n${content.slice(0, 4000)}\n"""\n\nReturn: {"risk_score": <0-100>, "verdict": "greenlit"|"caution"|"blocked", "issues": [{"issue": "<text>", "legal_basis": "<law/regulation>", "severity": "low"|"medium"|"high"|"critical"}]}`,
        }],
      });
      const raw = resp.content[0].type === "text" ? resp.content[0].text : "";
      const cleaned = raw.replace(/^```json?\n?/m, "").replace(/\n?```$/m, "").trim();
      const parsed = JSON.parse(cleaned) as typeof sonnetResult;
      sonnetResult = parsed;
    } catch {
      // best-effort — if Sonnet fails, return a neutral result
    }

    const nonINNote: FlaggedIssue = {
      issue: `VPS checkers are India-only. Sonnet AI analysis used for ${jurisdictionName}.`,
      legal_basis: "System note",
      severity: "low",
    };

    output = {
      overall_verdict: sonnetResult.verdict ?? "greenlit",
      overall_risk_score: Math.min(100, Math.max(0, Math.round(Number(sonnetResult.risk_score ?? 0)))),
      results: [{
        checker_id: "sonnet_fallback",
        checker_name: `${jurisdictionName} AI Analysis`,
        verdict: sonnetResult.verdict ?? "greenlit",
        risk_score: sonnetResult.risk_score ?? 0,
        flagged_issues: sonnetResult.issues ?? [],
        safe_to_publish: (sonnetResult.verdict ?? "greenlit") === "greenlit",
      }],
      top_issues: [nonINNote, ...(sonnetResult.issues ?? [])].slice(0, 3),
      requires_lawyer: (sonnetResult.risk_score ?? 0) >= 70,
    };
  } else {
    // Resolve which checkers to run
    if (run_all || (!checker_ids?.length)) {
      checkerIds = CHECKERS.map((c) => c.id);
    } else {
      checkerIds = (checker_ids ?? []).filter((id) => CHECKER_MAP[id]);
      if (!checkerIds.length) {
        return NextResponse.json({ error: "No valid checker_ids provided" }, { status: 400 });
      }
    }

    // Run all checkers in parallel — never fail entire scan if one is down
    const settled = await Promise.allSettled(
      checkerIds.map((id) => callChecker(id, content, content_type))
    );

    const results: CheckerResult[] = settled.map((s) =>
      s.status === "fulfilled"
        ? s.value
        : {
            checker_id: "unknown",
            checker_name: "Unknown",
            verdict: "caution" as CheckerVerdict,
            risk_score: 0,
            flagged_issues: [],
            safe_to_publish: true,
            error: "Unexpected error",
          }
    );

    const scores = results.map((r) => r.risk_score);
    const overall_risk_score = scores.length
      ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
      : 0;
    const overall_verdict = verdictFromScore(overall_risk_score);

    const allIssues: FlaggedIssue[] = results.flatMap((r) => r.flagged_issues);
    const top_issues = [...allIssues]
      .sort((a, b) => SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity])
      .slice(0, 3);

    const requires_lawyer =
      overall_risk_score >= 70 ||
      allIssues.some((i) => i.severity === "critical");

    output = {
      overall_verdict,
      overall_risk_score,
      results,
      top_issues,
      requires_lawyer,
    };
  }

  // Persist — use service client to bypass RLS insert check for column set
  try {
    const service = await createServiceClient();
    await service.from("content_scans").insert({
      organisation_id: profile.organisation_id,
      campaign_id: campaign_id ?? null,
      content_type: content_type as import("@/types/database.types").ContentType,
      raw_content: content,
      scan_result_json: output as unknown as import("@/types/database.types").Json,
      risk_score: output.overall_risk_score,
      verdict: output.overall_verdict as import("@/types/database.types").ScanVerdict,
      checker_ids_run: checkerIds,
      top_issues_json: output.top_issues as unknown as import("@/types/database.types").Json,
      requires_lawyer: output.requires_lawyer,
      jurisdiction,
      created_by: user.id,
    });
  } catch (dbErr) {
    console.error("content_scans insert failed:", dbErr);
  }

  return NextResponse.json(output);
}
