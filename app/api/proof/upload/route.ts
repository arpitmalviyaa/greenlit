import { NextResponse } from "next/server";
import { internalError } from "@/lib/api/errors";
import { createClient, createServiceClient } from "@/lib/supabase/server";

const MAX_BYTES = 25 * 1024 * 1024;

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("organisation_id")
    .eq("id", user.id)
    .single();
  if (!profile?.organisation_id) return NextResponse.json({ error: "No organisation" }, { status: 403 });

  const formData = await req.formData();
  const approval_request_id = formData.get("approval_request_id") as string | null;
  const sow_id = formData.get("sow_id") as string;
  const contract_id = formData.get("contract_id") as string;
  const entry_type = formData.get("entry_type") as string;
  const title = formData.get("title") as string;
  const file = formData.get("file") as File | null;

  if ((!sow_id && !contract_id) || (sow_id && contract_id) || !entry_type || !title) {
    return NextResponse.json({ error: "exactly one of sow_id or contract_id, plus entry_type and title, is required" }, { status: 400 });
  }

  let file_path: string | null = null;

  if (file) {
    if (file.size > MAX_BYTES) return NextResponse.json({ error: "File exceeds 25 MB limit" }, { status: 400 });
    const segment = approval_request_id ? approval_request_id : "general";
    const fileName = `${Date.now()}_${safeFileName(file.name)}`;
    const contextId = contract_id || sow_id;
    const storagePath = `${profile.organisation_id}/${contextId}/${segment}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from("proof-vault")
      .upload(storagePath, file, { upsert: false });

    if (uploadError) return internalError("app/api/proof/upload/route.ts", { message: uploadError.message });
    file_path = storagePath;
  }

  const service = await createServiceClient();
  const { data: entry, error } = await service
    .from("proof_vault_entries")
    .insert({
      organisation_id: profile.organisation_id,
      approval_request_id: approval_request_id ?? null,
      sow_id: sow_id || null,
      contract_id: contract_id || null,
      entry_type: entry_type as "screenshot" | "video" | "document" | "url_capture" | "metric_report",
      title,
      file_path,
      uploaded_by: user.id,
    })
    .select()
    .single();

  if (error) return internalError("app/api/proof/upload/route.ts", { message: error.message });

  return NextResponse.json({ entry });
}

function safeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 160) || "proof";
}
