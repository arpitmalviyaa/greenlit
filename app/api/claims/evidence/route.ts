import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

const MAX_FILE_BYTES = 20 * 1024 * 1024; // 20MB

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
  const claim_id = (formData.get("claim_id") as string | null)?.trim() ?? "";
  const evidence_type = (formData.get("evidence_type") as string | null)?.trim() ?? "";
  const title = (formData.get("title") as string | null)?.trim() ?? "";
  const description = (formData.get("description") as string | null)?.trim() ?? null;
  const file = formData.get("file") as File | null;

  if (!claim_id) return NextResponse.json({ error: "claim_id is required" }, { status: 400 });
  if (!title) return NextResponse.json({ error: "title is required" }, { status: 400 });
  if (!evidence_type) return NextResponse.json({ error: "evidence_type is required" }, { status: 400 });

  const serviceClient = await createServiceClient();

  // Verify claim belongs to same org
  const { data: claim } = await serviceClient
    .from("claims")
    .select("organisation_id")
    .eq("id", claim_id)
    .single();
  if (!claim || claim.organisation_id !== profile.organisation_id) {
    return NextResponse.json({ error: "Claim not found" }, { status: 404 });
  }

  let file_path: string | null = null;

  if (file && file.size > 0) {
    if (file.size > MAX_FILE_BYTES) {
      return NextResponse.json({ error: "File exceeds 20MB limit" }, { status: 413 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const storagePath = `${profile.organisation_id}/${claim_id}/${Date.now()}_${file.name}`;

    const { error: uploadError } = await serviceClient.storage
      .from("claim-evidence")
      .upload(storagePath, buffer, { contentType: file.type, upsert: false });

    if (uploadError) {
      return NextResponse.json({ error: "File upload failed: " + uploadError.message }, { status: 500 });
    }
    file_path = storagePath;
  }

  const validEvidenceTypes = ["study", "certification", "test_result", "regulatory_approval", "screenshot", "other"] as const;
  type EvidenceType = typeof validEvidenceTypes[number];
  if (!validEvidenceTypes.includes(evidence_type as EvidenceType)) {
    return NextResponse.json({ error: "Invalid evidence_type" }, { status: 400 });
  }

  const { error: evidenceError } = await serviceClient.from("claim_evidence").insert({
    claim_id,
    evidence_type: evidence_type as EvidenceType,
    title,
    description,
    file_path,
    uploaded_by: user.id,
  });

  if (evidenceError) return NextResponse.json({ error: evidenceError.message }, { status: 500 });

  // Audit log — server-side only
  await serviceClient.from("claim_audit_log").insert({
    claim_id,
    action: "evidence_added",
    performed_by: user.id,
    metadata: { title, evidence_type },
  });

  // Return updated claim with evidence
  const { data: updatedClaim } = await serviceClient
    .from("claims")
    .select("*, claim_evidence(*)")
    .eq("id", claim_id)
    .single();

  return NextResponse.json(updatedClaim);
}
