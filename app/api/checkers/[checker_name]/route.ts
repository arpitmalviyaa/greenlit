import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { CHECKER_MAP } from "@/lib/utils/checkers";

const VPS_BASE = "http://100.90.36.128:8765";
const VPS_TIMEOUT_MS = 5000;

export async function POST(
  request: Request,
  { params }: { params: Promise<{ checker_name: string }> }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const { checker_name } = await params;

  if (!CHECKER_MAP[checker_name]) {
    return NextResponse.json({ error: `Unknown checker: ${checker_name}` }, { status: 400 });
  }

  const body = await request.json() as { content?: string; content_type?: string };
  const { content, content_type } = body;
  if (!content || !content_type) {
    return NextResponse.json({ error: "content and content_type required" }, { status: 400 });
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), VPS_TIMEOUT_MS);

  try {
    const vpsResp = await fetch(`${VPS_BASE}/check/${checker_name}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content, content_type }),
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (!vpsResp.ok) {
      const text = await vpsResp.text().catch(() => "VPS error");
      return NextResponse.json({ error: text }, { status: 502 });
    }

    const data = await vpsResp.json();
    return NextResponse.json(data);
  } catch (err) {
    clearTimeout(timer);
    const isTimeout = err instanceof Error && err.name === "AbortError";
    return NextResponse.json(
      { error: isTimeout ? "Checker timed out" : "VPS unreachable" },
      { status: 504 }
    );
  }
}
