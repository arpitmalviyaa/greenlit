import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/corpus/admin";
import { reprocessStartupDocument } from "@/lib/startup/run";

const NOT_FOUND = NextResponse.json({ error: "Not found" }, { status: 404 });

// Reprocess a failed startup document (re-extract text + terms).
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!await requireAdmin()) return NOT_FOUND;
  const { id } = await params;
  const result = await reprocessStartupDocument(id);
  if (!result.ok) {
    return NextResponse.json({ error: result.error ?? "reprocess failed" }, { status: result.error === "not found" ? 404 : 422 });
  }
  return NextResponse.json(result);
}
