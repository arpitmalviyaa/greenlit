import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

const ALLOWED = new Set([
  "hero_cta_click",
  "live_check_used",
  "signup_start",
  "signup_complete",
  "pricing_cta_click",
]);

export async function POST(request: Request) {
  try {
    const body = await request.json() as { event?: string; path?: string; meta?: Record<string, string> };
    if (!body.event || !ALLOWED.has(body.event)) {
      return NextResponse.json({ ok: false }, { status: 400 });
    }
    const service = await createServiceClient();
    await service.from("analytics_events").insert({
      event: body.event,
      path: (body.path ?? "").slice(0, 200),
      meta: body.meta ?? {},
    });
  } catch {
    // analytics is best-effort
  }
  return NextResponse.json({ ok: true });
}
