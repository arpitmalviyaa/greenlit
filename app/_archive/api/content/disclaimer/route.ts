import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAnthropicClient } from "@/lib/anthropic/client";
import { MODELS } from "@/lib/anthropic/utils";
import { CONTENT_DISCLAIMER_SYSTEM, contentDisclaimerUser } from "@/lib/anthropic/prompts/content-disclaimer";

const VALID_TYPES = [
  "paid_partnership",
  "financial",
  "health",
  "affiliate",
  "educational",
  "ai_generated",
  "results_not_typical",
  "no_professional_advice",
  "contest",
  "before_after",
] as const;

interface DisclaimerItem {
  type: string;
  text: string;
  placement: "start" | "end" | "inline";
}

interface DisclaimerResult {
  disclaimers: DisclaimerItem[];
  warning: string;
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
    content_types?: string[];
  };

  const { content, content_types } = body;
  if (!content) {
    return NextResponse.json({ error: "content required" }, { status: 400 });
  }

  const validTypes = (content_types ?? []).filter((t) =>
    VALID_TYPES.includes(t as typeof VALID_TYPES[number])
  );
  if (!validTypes.length) {
    return NextResponse.json({ error: "At least one valid content_types entry required" }, { status: 400 });
  }

  const anthropic = getAnthropicClient();

  try {
    const resp = await anthropic.messages.create({
      model: MODELS.HAIKU,
      max_tokens: 600,
      system: CONTENT_DISCLAIMER_SYSTEM,
      messages: [
        {
          role: "user",
          content: contentDisclaimerUser(content, validTypes),
        },
      ],
    });

    const raw = resp.content[0].type === "text" ? resp.content[0].text : "";
    const parsed = safeParse<DisclaimerResult>(raw);
    if (!parsed) return NextResponse.json({ error: "Failed to parse disclaimer output" }, { status: 500 });

    return NextResponse.json(parsed);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Disclaimer generation failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
