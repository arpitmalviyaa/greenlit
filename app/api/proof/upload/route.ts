import { NextResponse } from "next/server";
import { internalError } from "@/lib/api/errors";
import { createClient, createServiceClient } from "@/lib/supabase/server";

const MAX_BYTES = 25 * 1024 * 1024;
const ENTRY_TYPES = new Set(["screenshot", "video", "document", "url_capture", "metric_report"]);
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

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
  const approval_request_id = String(formData.get("approval_request_id") ?? "");
  const sow_id = String(formData.get("sow_id") ?? "");
  const contract_id = String(formData.get("contract_id") ?? "");
  const entry_type = String(formData.get("entry_type") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const file = formData.get("file") as File | null;

  if ((!sow_id && !contract_id) || (sow_id && contract_id) || !entry_type || !title) {
    return NextResponse.json({ error: "exactly one of sow_id or contract_id, plus entry_type and title, is required" }, { status: 400 });
  }
  if (!ENTRY_TYPES.has(entry_type)) return NextResponse.json({ error: "Unsupported proof entry type" }, { status: 400 });
  if (contract_id && !UUID_RE.test(contract_id)) return NextResponse.json({ error: "contract_id must be a UUID" }, { status: 400 });
  if (sow_id && !UUID_RE.test(sow_id)) return NextResponse.json({ error: "sow_id must be a UUID" }, { status: 400 });
  if (approval_request_id && !UUID_RE.test(approval_request_id)) return NextResponse.json({ error: "approval_request_id must be a UUID" }, { status: 400 });

  const context = contract_id
    ? await supabase.from("contracts").select("id").eq("id", contract_id).eq("organisation_id", profile.organisation_id).maybeSingle()
    : await supabase.from("sows").select("id").eq("id", sow_id).eq("organisation_id", profile.organisation_id).maybeSingle();
  if (context.error || !context.data) {
    return NextResponse.json({ error: contract_id ? "Contract not found" : "SOW not found" }, { status: 404 });
  }

  if (approval_request_id) {
    const { data: approval, error } = await supabase
      .from("approval_requests")
      .select("id, sow_id, contract_id")
      .eq("id", approval_request_id)
      .eq("organisation_id", profile.organisation_id)
      .maybeSingle();
    if (error || !approval) return NextResponse.json({ error: "Approval request not found" }, { status: 404 });
    if ((contract_id && approval.contract_id !== contract_id) || (sow_id && approval.sow_id !== sow_id)) {
      return NextResponse.json({ error: "Approval request does not match proof context" }, { status: 400 });
    }
  }

  let file_path: string | null = null;

  if (file) {
    if (file.size === 0) return NextResponse.json({ error: "File is empty" }, { status: 400 });
    if (file.size > MAX_BYTES) return NextResponse.json({ error: "File exceeds 25 MB limit" }, { status: 400 });
    const segment = approval_request_id || "general";
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
      approval_request_id: approval_request_id || null,
      sow_id: sow_id || null,
      contract_id: contract_id || null,
      entry_type: entry_type as "screenshot" | "video" | "document" | "url_capture" | "metric_report",
      title,
      file_path,
      uploaded_by: user.id,
    })
    .select()
    .single();

  if (error) {
    if (file_path) await supabase.storage.from("proof-vault").remove([file_path]);
    return internalError("app/api/proof/upload/route.ts", { message: error.message });
  }

  return NextResponse.json({ entry });
}

function safeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 160) || "proof";
}
