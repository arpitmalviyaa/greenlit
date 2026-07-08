import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/corpus/admin";
import { createServiceClient } from "@/lib/supabase/server";
import { MemoSchema } from "@/lib/anthropic/prompts/startup-review";
import { memoToHtml } from "@/lib/startup/memo-html";

const NOT_FOUND = NextResponse.json({ error: "Not found" }, { status: 404 });

// Print-ready memo HTML (reviewer prints to PDF). HARD-GATED: only a REVIEWED memo
// exports. A draft returns 403 — the export path is unreachable in draft.
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!await requireAdmin()) return NOT_FOUND;
  const { id } = await params;
  const service = await createServiceClient();
  const { data: memo } = await service.from("startup_memos")
    .select("memo_json, status, prepared_for, document_label, reviewed_by, reviewed_at")
    .eq("matter_id", id).order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (!memo) return NOT_FOUND;
  if (memo.status !== "reviewed") {
    return NextResponse.json({ error: "Memo is in draft. It must be marked reviewed before export." }, { status: 403 });
  }
  const parsed = MemoSchema.safeParse(memo.memo_json);
  if (!parsed.success) return NextResponse.json({ error: "stored memo is malformed" }, { status: 500 });

  const html = memoToHtml(parsed.data, {
    prepared_for: memo.prepared_for,
    document_label: memo.document_label,
    date: memo.reviewed_at ? new Date(memo.reviewed_at as string).toISOString().slice(0, 10) : null,
    reviewed_by: memo.reviewed_by,
    status: "reviewed",
  });
  return new NextResponse(html, { status: 200, headers: { "Content-Type": "text/html; charset=utf-8" } });
}
