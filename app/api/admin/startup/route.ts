import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { requireAdmin } from "@/lib/corpus/admin";
import { createServiceClient } from "@/lib/supabase/server";
import { createStartupMatter, isStartupSubType, type NewDoc } from "@/lib/startup/run";

const NOT_FOUND = NextResponse.json({ error: "Not found" }, { status: 404 });
const MAX_BYTES = 15 * 1024 * 1024;

// List matters with their latest memo status.
export async function GET() {
  if (!await requireAdmin()) return NOT_FOUND;
  const service = await createServiceClient();
  const { data, error } = await service
    .from("startup_matters")
    .select("id, title, sub_type, created_at, startup_memos(id, status, created_at), startup_documents(count)")
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

// Create a matter: N documents + sub_types + optional founder context → analyse → draft memo.
export async function POST(request: Request) {
  const user = await requireAdmin();
  if (!user) return NOT_FOUND;

  let form: FormData;
  try { form = await request.formData(); }
  catch { return NextResponse.json({ error: "multipart/form-data required" }, { status: 400 }); }

  const title = String(form.get("title") ?? "").trim();
  if (!title) return NextResponse.json({ error: "title required" }, { status: 400 });

  const founderContext = {
    stage: (form.get("stage") as string | null)?.trim() || undefined,
    round: (form.get("round") as string | null)?.trim() || undefined,
    concerns: (form.get("concerns") as string | null)?.trim() || undefined,
  };
  const workspace_id = (form.get("workspace_id") as string | null)?.trim() || null;

  // Files paired with sub_types by index: file[], sub_type[].
  const files = form.getAll("file").filter((f): f is File => f instanceof File);
  const subTypes = form.getAll("sub_type").map(String);
  if (!files.length) return NextResponse.json({ error: "at least one document required" }, { status: 400 });

  const docs: NewDoc[] = [];
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const sub_type = subTypes[i];
    if (file.size > MAX_BYTES) return NextResponse.json({ error: `${file.name} exceeds 15 MB` }, { status: 400 });
    if (!isStartupSubType(sub_type)) return NextResponse.json({ error: `invalid sub_type for ${file.name}` }, { status: 400 });
    const buffer = Buffer.from(await file.arrayBuffer());
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-80);
    docs.push({
      sub_type, title: file.name,
      file: { buffer, fileName: file.name, mimeType: file.type || "application/pdf", storageKey: `${randomUUID()}/${safeName}` },
    });
  }

  try {
    const result = await createStartupMatter({
      workspace_id, created_by: user.id, title, founder_context: founderContext, docs,
    });
    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "analysis failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
