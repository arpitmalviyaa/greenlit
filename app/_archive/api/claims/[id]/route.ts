import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("organisation_id")
    .eq("id", user.id)
    .single();
  if (!profile?.organisation_id) return NextResponse.json({ error: "No organisation" }, { status: 403 });

  const serviceClient = await createServiceClient();
  const { data: claim, error } = await serviceClient
    .from("claims")
    .select(`
      *,
      claim_evidence(*),
      claim_audit_log(*)
    `)
    .eq("id", params.id)
    .single();

  if (error || !claim) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Org membership check
  if (claim.organisation_id !== profile.organisation_id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json(claim);
}
