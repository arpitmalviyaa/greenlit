import { NextResponse } from "next/server";
import { internalError } from "@/lib/api/errors";
import { createClient, createServiceClient } from "@/lib/supabase/server";

function storagePath(fileUrl: string) {
  const marker = "/storage/v1/object/sign/contracts/";
  const start = fileUrl.indexOf(marker);
  if (start === -1) return null;
  return decodeURIComponent(fileUrl.slice(start + marker.length).split("?")[0]);
}

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const contractId = new URL(request.url).searchParams.get("contract_id");
  if (!contractId) return NextResponse.json({ error: "contract_id required" }, { status: 400 });

  const { data: contract } = await supabase
    .from("contracts")
    .select("file_url, file_name")
    .eq("id", contractId)
    .eq("uploaded_by", user.id)
    .single();

  if (!contract?.file_url) return NextResponse.json({ error: "File not found" }, { status: 404 });
  const path = storagePath(contract.file_url);
  if (!path) return NextResponse.json({ url: contract.file_url, file_name: contract.file_name });

  const service = await createServiceClient();
  const { data, error } = await service.storage.from("contracts").createSignedUrl(path, 60 * 10);
  if (error || !data) return internalError("app/api/counsel/file/route.ts", { message: error?.message ?? "Could not sign file" });

  return NextResponse.json({ url: data.signedUrl, file_name: contract.file_name });
}
