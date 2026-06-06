import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { extractTextFromBuffer } from "@/lib/utils/extract-text";

const MAX_BYTES = 10 * 1024 * 1024; // 10 MB
const ALLOWED_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("organisation_id")
    .eq("id", user.id)
    .single();

  if (!profile?.organisation_id) {
    return NextResponse.json({ error: "No organisation found" }, { status: 403 });
  }

  // Parse multipart form
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  const file = formData.get("file") as File | null;
  const title = (formData.get("title") as string | null)?.trim() || file?.name || "Untitled Contract";

  if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });
  if (file.size > MAX_BYTES) return NextResponse.json({ error: "File exceeds 10 MB limit" }, { status: 400 });
  if (!ALLOWED_TYPES.includes(file.type) && !file.name.match(/\.(pdf|docx)$/i)) {
    return NextResponse.json({ error: "Only PDF and DOCX files are accepted" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  // Extract text
  const { text, error: extractError } = await extractTextFromBuffer(buffer, file.type, file.name);

  // Upload to Supabase Storage
  const service = await createServiceClient();
  const storagePath = `${profile.organisation_id}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;

  const { error: storageError } = await service.storage
    .from("contracts")
    .upload(storagePath, buffer, { contentType: file.type, upsert: false });

  if (storageError) {
    return NextResponse.json(
      { error: `Storage upload failed: ${storageError.message}` },
      { status: 500 }
    );
  }

  const { data: urlData } = service.storage.from("contracts").getPublicUrl(storagePath);

  // Insert contract row
  const { data: contract, error: dbError } = await service
    .from("contracts")
    .insert({
      organisation_id: profile.organisation_id,
      title,
      file_url: urlData.publicUrl,
      file_name: file.name,
      file_size_bytes: file.size,
      raw_text: text || null,
      uploaded_by: user.id,
      status: "pending_review",
    })
    .select("id, title, status")
    .single();

  if (dbError || !contract) {
    // Best-effort storage cleanup
    await service.storage.from("contracts").remove([storagePath]);
    return NextResponse.json({ error: dbError?.message ?? "DB insert failed" }, { status: 500 });
  }

  return NextResponse.json({
    contract_id: contract.id,
    title: contract.title,
    text_preview: text ? text.slice(0, 500) : null,
    extraction_error: extractError ?? null,
    extraction_success: !!text,
  }, { status: 201 });
}
