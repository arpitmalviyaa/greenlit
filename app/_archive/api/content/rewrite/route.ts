import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAnthropicClient } from "@/lib/anthropic/client";
import { MODELS } from "@/lib/anthropic/utils";
import { CONTENT_REWRITE_SYSTEM, contentRewriteUser } from "@/lib/anthropic/prompts/content-rewrite";

const VALID_TONES = ["bold", "luxury", "gen_z", "casual", "professional", "financial_educator"] as const;
type Tone = typeof VALID_TONES[number];

interface RewriteResult {
  rewritten_content: string;
  changes_made: string[];
  still_risky: boolean;
}

function safeParse<T>(text: string): T | null {
  try {
    const cleaned = text.replace(/^```json?\n?/m, "").replace(/\n?```$/m, "").trim();
    return JSON.parse(cleaned) as T;
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const body = await request.json() as {
    content?: string;
    content_type?: string;
    issues?: string[];
    tone?: string;
  };

  const { content, content_type, issues, tone } = body;
  if (!content || !content_type) {
    return NextResponse.json({ error: "content and content_type required" }, { status: 400 });
  }

  const resolvedTone: Tone = VALID_TONES.includes(tone as Tone) ? (tone as Tone) : "casual";

  const anthropic = getAnthropicClient();

  try {
    const resp = await anthropic.messages.create({
      model: MODELS.HAIKU,
      max_tokens: 1000,
      system: CONTENT_REWRITE_SYSTEM,
      messages: [
        {
          role: "user",
          content: contentRewriteUser(content, content_type, issues ?? [], resolvedTone),
        },
      ],
    });

    const raw = resp.content[0].type === "text" ? resp.content[0].text : "";
    const parsed = safeParse<RewriteResult>(raw);
    if (!parsed) return NextResponse.json({ error: "Failed to parse rewrite output" }, { status: 500 });

    return NextResponse.json(parsed);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Rewrite failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
