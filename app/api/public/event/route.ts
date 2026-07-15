import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/engine/infrastructure/rate-limit";

const ALLOWED = new Set([
  "hero_cta_click",
  "live_check_used",
  "signup_start",
  "signup_complete",
  "pricing_cta_click",
]);

export async function POST(request: Request) {
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > 2_048) return NextResponse.json({ ok: false }, { status: 413 });

  const client = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const rate = checkRateLimit(`public-event:${client}`, { limit: 30, windowMs: 60_000 });
  if (!rate.allowed) return NextResponse.json({ ok: false }, { status: 429 });

  try {
    const body = await request.json() as { event?: string; path?: string; meta?: unknown };
    if (JSON.stringify(body).length > 2_048) return NextResponse.json({ ok: false }, { status: 413 });
    if (!body.event || !ALLOWED.has(body.event)) {
      return NextResponse.json({ ok: false }, { status: 400 });
    }
    const meta = sanitizeMeta(body.meta);
    if (meta === null) return NextResponse.json({ ok: false }, { status: 400 });
    const service = await createServiceClient();
    await service.from("analytics_events").insert({
      event: body.event,
      path: (body.path ?? "").slice(0, 200),
      meta,
    });
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}

function sanitizeMeta(input: unknown): Record<string, string> | null {
  if (input == null) return {};
  if (typeof input !== "object" || Array.isArray(input)) return null;
  const entries = Object.entries(input);
  if (entries.length > 8) return null;
  const safe: Record<string, string> = {};
  for (const [key, value] of entries) {
    if (!/^[a-zA-Z0-9_-]{1,40}$/.test(key) || typeof value !== "string" || value.length > 200) return null;
    safe[key] = value;
  }
  return safe;
}
