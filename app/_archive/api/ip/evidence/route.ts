import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase.from("profiles").select("organisation_id").eq("id", user.id).single();
  if (!profile?.organisation_id) return NextResponse.json({ error: "No organisation" }, { status: 403 });

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const infringement_record_id = formData.get("infringement_record_id") as string | null;

  if (!file || !infringement_record_id) {
    return NextResponse.json({ error: "file and infringement_record_id are required" }, { status: 400 });
  }

  const { data: record } = await supabase
    .from("infringement_records")
    .select("ip_record_id, evidence_paths, organisation_id")
    .eq("id", infringement_record_id)
    .single();
  if (!record || record.organisation_id !== profile.organisation_id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const serviceClient = await createServiceClient();
  const path = `${profile.organisation_id}/${record.ip_record_id}/${infringement_record_id}/${file.name}`;
  const { error: uploadError } = await serviceClient.storage
    .from("ip-evidence")
    .upload(path, file, { upsert: true });

  if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 });

  const currentPaths = Array.isArray(record.evidence_paths) ? record.evidence_paths : [];
  const updatedPaths = [...currentPaths, path];

  await serviceClient.from("infringement_records")
    .update({ evidence_paths: updatedPaths })
    .eq("id", infringement_record_id);

  return NextResponse.json({ path, evidence_paths: updatedPaths });
}
