import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/corpus/admin";
import { createServiceClient } from "@/lib/supabase/server";

const NOT_FOUND = NextResponse.json({ error: "Not found" }, { status: 404 });
const CLAUSE_TYPES = ["usage_rights", "exclusivity", "payment_terms", "indemnity", "termination", "morality", "ip_assignment", "confidentiality", "deliverables", "other"];
const STANCES = ["market_standard", "creator_favorable", "brand_aggressive", "dispute_source", "founder_approved"];

// Inline-edit a chunk's clause_type / stance / risk_note. Editing marks it ready.
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!await requireAdmin()) return NOT_FOUND;
  const { id } = await params;
  const body = await req.json() as { clause_type?: string | null; stance?: string; risk_note?: string | null };

  const patch: Record<string, unknown> = { status: "ready" };
  if (body.clause_type !== undefined) {
    if (body.clause_type !== null && !CLAUSE_TYPES.includes(body.clause_type))
      return NextResponse.json({ error: "invalid clause_type" }, { status: 400 });
    patch.clause_type = body.clause_type;
  }
  if (body.stance !== undefined) {
    if (!STANCES.includes(body.stance)) return NextResponse.json({ error: "invalid stance" }, { status: 400 });
    patch.stance = body.stance;
  }
  if (body.risk_note !== undefined) patch.risk_note = body.risk_note?.slice(0, 2000) ?? null;

  const service = await createServiceClient();
  const { data, error } = await service.from("corpus_chunks")
    .update(patch).eq("id", id).select("id, clause_type, risk_note, stance, status").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!await requireAdmin()) return NOT_FOUND;
  const { id } = await params;
  const service = await createServiceClient();
  const { error } = await service.from("corpus_chunks").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ deleted: true });
}
