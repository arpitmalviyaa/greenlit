import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { internalError } from "@/lib/api/errors";

// Reviewer verdict on a statutory finding. Signal feeds chunk_feedback_scores,
// which nudges retrieval ranking (see lib/corpus/retrieve.ts) and seeds the
// golden set (scripts/corpus-eval.ts).
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const body = await request.json() as { finding_id?: string; verdict?: string; note?: string };
  if (!body.finding_id || !["accepted", "rejected"].includes(body.verdict ?? "")) {
    return NextResponse.json({ error: "finding_id and verdict (accepted|rejected) required" }, { status: 400 });
  }

  const service = await createServiceClient();
  const { error } = await service.from("finding_feedback").insert({
    finding_id: body.finding_id,
    verdict: body.verdict,
    note: body.note?.slice(0, 1000) ?? null,
    user_id: user.id,
  });
  // FK failure = unknown finding id → 404 rather than 500.
  if (error?.code === "23503") return NextResponse.json({ error: "Finding not found" }, { status: 404 });
  if (error) return internalError("app/api/compliance/feedback/route.ts", { message: error.message });
  return NextResponse.json({ ok: true }, { status: 201 });
}
