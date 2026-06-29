import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { validateDocxPackage } from "@/lib/engine/docx/package";
import { checkRateLimit } from "@/lib/engine/infrastructure/rate-limit";
import { extractTextFromBuffer } from "@/lib/utils/extract-text";
import { createHash, randomUUID } from "crypto";

const MAX_BYTES = 10 * 1024 * 1024; // 10 MB
const UPLOADS_PER_MINUTE = 12;
const ALLOWED_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

export async function POST(request: Request) {
  const requestId = request.headers.get("x-request-id") ?? randomUUID();
  const errorId = () => randomUUID();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, organisation_id, role")
    .eq("id", user.id)
    .single();

  if (!profile?.organisation_id) {
    return NextResponse.json({ error: "No organisation found" }, { status: 403 });
  }
  if (!["agency_admin", "manager", "creator"].includes(profile.role)) {
    return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
  }
  const rate = checkRateLimit(`contract-upload:${profile.organisation_id}:${user.id}`, {
    limit: UPLOADS_PER_MINUTE,
    windowMs: 60_000,
  });
  if (!rate.allowed) {
    return NextResponse.json(
      { error: "Too many uploads; try again shortly" },
      { status: 429, headers: { "Retry-After": String(Math.max(1, Math.ceil((rate.reset_at.getTime() - Date.now()) / 1000))) } }
    );
  }

  // Parse multipart form
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  const file = formData.get("file") as File | null;
  const title = clampTitle((formData.get("title") as string | null)?.trim() || file?.name || "Untitled Contract");

  if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });
  if (file.size > MAX_BYTES) return NextResponse.json({ error: "File exceeds 10 MB limit" }, { status: 400 });
  if (!ALLOWED_TYPES.includes(file.type) && !file.name.match(/\.(pdf|docx)$/i)) {
    return NextResponse.json({ error: "Only PDF and DOCX files are accepted" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const contentSha256 = createHash("sha256").update(buffer).digest("hex");
  if (isDocx(file.type, file.name)) {
    const report = validateDocxPackage(buffer);
    if (!report.valid) {
      console.warn("contract_upload_docx_rejected", {
        request_id: requestId,
        organisation_id: profile.organisation_id,
        user_id: user.id,
        issue_codes: report.issues.map((issue) => issue.code),
        bytes: file.size,
      });
      return NextResponse.json({ error: "Invalid DOCX package", issue_codes: report.issues.map((issue) => issue.code) }, { status: 400 });
    }
  }

  // Extract text
  const { text, html, error: extractError } = await extractTextFromBuffer(buffer, file.type, file.name);

  // Upload to Supabase Storage.
  // Objects are keyed by organisation_id so the contracts bucket is org-scoped,
  // matching the same_org policy on the contracts table and the org-scoped
  // storage RLS in migration 026 (any org member can read/write the org's files).
  const service = await createServiceClient();
  const storagePath = `${profile.organisation_id}/${Date.now()}-${safeFileName(file.name)}`;
  const bucket = process.env.GREENLIT_STORAGE_BUCKET ?? "contracts";

  const { error: storageError } = await service.storage
    .from(bucket)
    .upload(storagePath, buffer, { contentType: file.type, upsert: false });

  if (storageError) {
    const id = errorId();
    console.error("contract_upload_storage_failed", { request_id: requestId, error_id: id, organisation_id: profile.organisation_id });
    return NextResponse.json(
      { error: "Storage upload failed", error_id: id },
      { status: 500 }
    );
  }

  const { data: urlData, error: signedUrlError } = await service.storage
    .from(bucket)
    .createSignedUrl(storagePath, 60 * 60);

  if (signedUrlError) {
    await service.storage.from(bucket).remove([storagePath]);
    const id = errorId();
    console.error("contract_upload_signed_url_failed", { request_id: requestId, error_id: id, organisation_id: profile.organisation_id });
    return NextResponse.json(
      { error: "Signed URL creation failed", error_id: id },
      { status: 500 }
    );
  }

  // Insert contract row
  const { data: contract, error: dbError } = await (service
    .from("contracts") as ReturnType<typeof service.from>)
    .insert({
      organisation_id: profile.organisation_id,
      title,
      file_url: urlData.signedUrl,
      file_name: file.name,
      file_size_bytes: file.size,
      content_sha256: contentSha256,
      raw_text: text || null,
      document_html: html || null,
      uploaded_by: user.id,
      status: "pending_review",
    })
    .select("id, title, status")
    .single();

  if (dbError || !contract) {
    // Best-effort storage cleanup
    await service.storage.from(bucket).remove([storagePath]);
    const id = errorId();
    console.error("contract_upload_db_failed", { request_id: requestId, error_id: id, organisation_id: profile.organisation_id });
    return NextResponse.json({ error: "Contract upload failed", error_id: id }, { status: 500 });
  }

  const automationResults = await Promise.allSettled([
    service.from("audit_logs").insert({
      organisation_id: profile.organisation_id,
      actor_id: user.id,
      action: "contract_uploaded",
      entity_type: "contracts",
      entity_id: contract.id,
      metadata: {
        file_name: file.name,
        file_size_bytes: file.size,
        content_sha256: contentSha256,
        extraction_success: !!text,
      },
    }),
    service.from("timeline").insert({
      organisation_id: profile.organisation_id,
      contract_id: contract.id,
      event_type: "contract_uploaded",
      payload: { title, summary: "Contract uploaded for review", extraction_success: !!text },
    }),
    service.from("background_jobs").insert({
      organisation_id: profile.organisation_id,
      kind: "document_parsing",
      payload: { contract_id: contract.id, storage_path: storagePath, content_sha256: contentSha256 },
      idempotency_key: `document_parsing:${contentSha256}`,
    }),
    service.from("notifications").insert({
      organisation_id: profile.organisation_id,
      profile_id: user.id,
      kind: "contract_uploaded",
      body: `${title}: uploaded for review`,
    }),
  ]);
  const automationError = automationResults.find((result) =>
    result.status === "rejected" || Boolean((result as PromiseFulfilledResult<{ error?: unknown }>).value?.error)
  );
  if (automationError) {
    console.warn("contract_upload_automation_failed", {
      request_id: requestId,
      organisation_id: profile.organisation_id,
      contract_id: contract.id,
    });
  }
  console.info("contract_upload_completed", {
    request_id: requestId,
    organisation_id: profile.organisation_id,
    contract_id: contract.id,
    bytes: file.size,
    extraction_success: !!text,
  });

  return NextResponse.json({
    contract_id: contract.id,
    title: contract.title,
    text_preview: text ? text.slice(0, 500) : null,
    extraction_error: extractError ?? null,
    extraction_success: !!text,
  }, { status: 201 });
}

function isDocx(mimeType: string, fileName: string): boolean {
  return mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" || fileName.toLowerCase().endsWith(".docx");
}

function safeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 160) || "contract";
}

function clampTitle(title: string): string {
  return title.slice(0, 180);
}
