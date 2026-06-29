import { NextResponse } from "next/server";
import { internalError } from "@/lib/api/errors";
import { createClient } from "@/lib/supabase/server";

export async function GET(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("organisation_id")
    .eq("id", user.id)
    .single();
  if (!profile?.organisation_id) return NextResponse.json({ error: "No organisation" }, { status: 403 });

  const url = new URL(req.url);
  const sow_id = url.searchParams.get("sow_id");
  const contract_id = url.searchParams.get("contract_id");
  const approval_request_id = url.searchParams.get("approval_request_id");

  let query = supabase
    .from("proof_vault_entries")
    .select("*")
    .eq("organisation_id", profile.organisation_id)
    .order("created_at", { ascending: false });

  if (sow_id) query = query.eq("sow_id", sow_id);
  if (contract_id) query = query.eq("contract_id", contract_id);
  if (approval_request_id) query = query.eq("approval_request_id", approval_request_id);

  const { data, error } = await query;
  if (error) return internalError("app/api/proof/list/route.ts", { message: error.message });

  // Generate signed URLs for file_path entries
  const entries = await Promise.all(
    (data ?? []).map(async (entry) => {
      if (entry.file_path) {
        const { data: signed } = await supabase.storage
          .from("proof-vault")
          .createSignedUrl(entry.file_path, 3600);
        return { ...entry, signed_url: signed?.signedUrl ?? null };
      }
      return { ...entry, signed_url: null };
    })
  );

  return NextResponse.json({ entries });
}
