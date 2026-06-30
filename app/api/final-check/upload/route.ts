import { NextResponse } from "next/server";
import { internalError } from "@/lib/api/errors";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { extractTextFromBuffer } from "@/lib/utils/extract-text";
import { getAnthropicClient } from "@/lib/anthropic/client";
import { MODELS } from "@/lib/anthropic/utils";

const MAX_BYTES = 10 * 1024 * 1024;

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const form = await request.formData();
  const contractId = String(form.get("contract_id") ?? "");
  const file = form.get("file") as File | null;
  if (!contractId || !file) return NextResponse.json({ error: "Contract and file required" }, { status: 400 });
  if (file.size > MAX_BYTES) return NextResponse.json({ error: "File exceeds 10 MB" }, { status: 400 });
  if (!file.name.match(/\.(pdf|docx)$/i)) return NextResponse.json({ error: "Only PDF and DOCX files are accepted" }, { status: 400 });

  const { data: contract } = await supabase
    .from("contracts")
    .select("id, title, raw_text, organisation_id")
    .eq("id", contractId)
    .eq("uploaded_by", user.id)
    .single();
  if (!contract?.raw_text) return NextResponse.json({ error: "Original contract text unavailable" }, { status: 422 });

  const buffer = Buffer.from(await file.arrayBuffer());
  const extracted = await extractTextFromBuffer(buffer, file.type, file.name);
  if (!extracted.text) return NextResponse.json({ error: extracted.error ?? "Could not extract revised contract" }, { status: 422 });

  const service = await createServiceClient();
  const { count } = await service.from("contract_versions").select("id", { count: "exact", head: true }).eq("contract_id", contractId);
  const version = (count ?? 0) + 2;
  const path = `${contract.organisation_id}/${contractId}/v${version}-${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
  const { error: uploadError } = await service.storage.from("contracts").upload(path, buffer, { contentType: file.type, upsert: false });
  if (uploadError) return internalError("app/api/final-check/upload/route.ts", { message: uploadError.message });

  const prompt = `Compare the original and revised Indian commercial agreement. Return strict JSON:
{"summary":"", "outcome":"improved|mixed|worse", "changes":[{"clause":"", "original":"", "revised":"", "outcome":"won|partly_won|conceded|unchanged|new", "legal_effect":"", "commercial_effect":"", "authority":""}], "unresolved":[], "silent_changes":[]}
Use a statute or judgment only when genuinely useful. Never invent citations.
ORIGINAL:
${contract.raw_text.slice(0, 45000)}

REVISED:
${extracted.text.slice(0, 45000)}`;

  const response = await getAnthropicClient().messages.create({
    model: MODELS.SONNET,
    max_tokens: 5000,
    system: "You are Greenlit's final contract-check counsel. Compare versions precisely and return JSON only.",
    messages: [{ role: "user", content: prompt }],
  });
  const raw = response.content[0]?.type === "text" ? response.content[0].text : "";
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  let comparison: unknown;
  try {
    comparison = JSON.parse(start >= 0 && end > start ? raw.slice(start, end + 1) : raw);
  } catch {
    await service.storage.from("contracts").remove([path]);
    return NextResponse.json({ error: "Final comparison returned invalid data" }, { status: 500 });
  }

  const { error: versionError } = await service.from("contract_versions").insert({
    contract_id: contractId,
    version_number: version,
    file_name: file.name,
    storage_path: path,
    raw_text: extracted.text,
    uploaded_by: user.id,
    comparison_json: comparison,
  });
  if (versionError) return internalError("app/api/final-check/upload/route.ts", { message: versionError.message });

  await service.from("negotiation_messages").insert({
    contract_id: contractId,
    direction: "internal",
    source_text: `Revised contract received: ${file.name} (version ${version})`,
    generated_text: null,
    tone: null,
    channel: "internal",
    created_by: user.id,
  });

  return NextResponse.json({ version, comparison });
}
