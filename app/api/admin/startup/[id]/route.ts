import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/corpus/admin";
import { createServiceClient } from "@/lib/supabase/server";
import { MemoSchema } from "@/lib/anthropic/prompts/startup-review";
import { internalError } from "@/lib/api/errors";

const NOT_FOUND = NextResponse.json({ error: "Not found" }, { status: 404 });

// Matter detail: documents + the memo (draft or reviewed).
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!await requireAdmin()) return NOT_FOUND;
  const { id } = await params;
  const service = await createServiceClient();
  const { data: matter } = await service.from("startup_matters")
    .select("id, title, sub_type, founder_context, created_at").eq("id", id).single();
  if (!matter) return NOT_FOUND;
  const { data: docs } = await service.from("startup_documents")
    .select("id, sub_type, title, status, doc_analysis, created_at").eq("matter_id", id).order("created_at");
  const { data: memo } = await service.from("startup_memos")
    .select("id, memo_json, status, prepared_for, document_label, reviewed_by, reviewed_at, created_at")
    .eq("matter_id", id).order("created_at", { ascending: false }).limit(1).maybeSingle();
  return NextResponse.json({ matter, documents: docs ?? [], memo: memo ?? null });
}

// Edit memo sections / header. Any edit returns the memo to DRAFT — export re-locks
// until an advocate re-reviews the amended memo.
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!await requireAdmin()) return NOT_FOUND;
  const { id } = await params;
  const body = await request.json() as {
    memo_json?: unknown; prepared_for?: string; document_label?: string; reviewed_by?: string;
  };
  const patch: Record<string, unknown> = { status: "draft", reviewed_at: null, reviewer_user: null, updated_at: new Date().toISOString() };
  if (body.memo_json !== undefined) {
    const parsed = MemoSchema.safeParse(body.memo_json);
    if (!parsed.success) return NextResponse.json({ error: "invalid memo_json", issues: parsed.error.issues }, { status: 400 });
    patch.memo_json = parsed.data;
  }
  for (const k of ["prepared_for", "document_label", "reviewed_by"] as const) {
    if (body[k] !== undefined) patch[k] = body[k];
  }
  const service = await createServiceClient();
  const { data, error } = await service.from("startup_memos")
    .update(patch).eq("matter_id", id).select("id, status").order("created_at", { ascending: false }).limit(1);
  if (error) return internalError("app/api/admin/startup/[id]/route.ts", { message: error.message });
  if (!data?.length) return NOT_FOUND;
  return NextResponse.json({ ok: true, status: "draft" });
}

// The human gate: mark REVIEWED (logs reviewer + timestamp). Only this unlocks export.
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireAdmin();
  if (!user) return NOT_FOUND;
  const { id } = await params;
  const service = await createServiceClient();
  const { data, error } = await service.from("startup_memos")
    .update({ status: "reviewed", reviewed_at: new Date().toISOString(), reviewer_user: user.id, updated_at: new Date().toISOString() })
    .eq("matter_id", id).select("id, status, reviewed_at");
  if (error) return internalError("app/api/admin/startup/[id]/route.ts", { message: error.message });
  if (!data?.length) return NOT_FOUND;
  return NextResponse.json({ ok: true, status: "reviewed", reviewed_at: data[0].reviewed_at });
}
