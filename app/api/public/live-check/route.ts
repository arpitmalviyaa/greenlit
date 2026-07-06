import { NextResponse } from "next/server";
import { z } from "zod";
import { MODELS } from "@/lib/anthropic/utils";
import { AIOutputError, callStructured } from "@/lib/anthropic/structured";

// The free live-check strip on the marketing homepage. No login. Hard limits:
// short input, Haiku model, tight token budget, per-IP rate limit.
// ponytail: in-memory rate limit is per-serverless-instance; move to a
// durable store if abuse shows up in the logs.
const WINDOW_MS = 60 * 60 * 1000;
const MAX_PER_WINDOW = 5;
const hits = new Map<string, number[]>();

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const arr = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  if (arr.length >= MAX_PER_WINDOW) return true;
  arr.push(now);
  hits.set(ip, arr);
  if (hits.size > 10_000) hits.clear(); // memory guard
  return false;
}

const LiveCheckSchema = z.object({
  verdict: z.enum(["greenlit", "caution", "blocked"]),
  headline: z.string().describe("One short plain-English sentence on the overall read"),
  top_issue: z
    .object({
      issue: z.string(),
      why_it_matters: z.string(),
      excerpt: z.string().max(120),
    })
    .nullable()
    .describe("The single most important issue, or null if clean"),
});

const SYSTEM = `You are an experienced reviewer of influencer-marketing content and contract clauses.
Given a short snippet (a caption, script excerpt, or contract clause), give a quick read:
the verdict, one headline sentence, and the single most important issue (or null if clean).
Calm and practical — plain English, no statute citations, no alarmism.
Report by calling the report_live_check tool.`;

export async function POST(request: Request) {
  const ip = (request.headers.get("x-forwarded-for") ?? "unknown").split(",")[0].trim();
  if (rateLimited(ip)) {
    return NextResponse.json(
      { error: "That's the free limit for now — sign up to keep checking." },
      { status: 429 }
    );
  }

  const body = await request.json().catch(() => ({})) as { content?: string };
  const content = (body.content ?? "").trim().slice(0, 1200);
  if (content.length < 15) {
    return NextResponse.json({ error: "Paste at least a sentence or a clause." }, { status: 400 });
  }

  try {
    const result = await callStructured({
      feature: "public.live_check",
      promptVersion: "v1",
      model: MODELS.HAIKU,
      maxTokens: 400,
      system: SYSTEM,
      user: `Snippet:\n"""\n${content}\n"""`,
      schema: LiveCheckSchema,
      toolName: "report_live_check",
    });
    return NextResponse.json(result);
  } catch (err) {
    const code = err instanceof AIOutputError ? err.code : "AI_REQUEST_FAILED";
    return NextResponse.json({ error: "The check could not finish — try again in a moment.", code }, { status: 502 });
  }
}
