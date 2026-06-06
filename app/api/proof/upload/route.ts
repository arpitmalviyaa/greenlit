import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

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
  const entry_type = formData.get("entry_type") as string;
  const title = formData.get("title") as string;
  const file = formData.get("file") as File | null;

  if (!sow_id || !entry_type || !title) {
    return NextResponse.json({ error: "sow_id, entry_type, title are required" }, { status: 400 });
  }

  let file_path: string | null = null;

  if (file) {
    const segment = approval_request_id ? approval_request_id : "general";
    const fileName = `${Date.now()}_${file.name}`;
    const storagePath = `${profile.organisation_id}/${sow_id}/${segment}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from("proof-vault")
      .upload(storagePath, file, { upsert: false });

    if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 });
    file_path = storagePath;
  }

  const service = await createServiceClient();
  const { data: entry, error } = await service
    .from("proof_vault_entries")
    .insert({
      organisation_id: profile.organisation_id,
      approval_request_id: approval_request_id ?? null,
      sow_id,
      entry_type: entry_type as "screenshot" | "video" | "document" | "url_capture" | "metric_report",
      title,
      file_path,
      uploaded_by: user.id,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ entry });
}
