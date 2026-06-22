import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("organisation_id, role")
    .eq("id", user.id)
    .single();
  if (!profile?.organisation_id) return NextResponse.json({ error: "No organisation" }, { status: 403 });

  const url = new URL(req.url);
  const status = url.searchParams.get("status");
  const sow_id = url.searchParams.get("sow_id");
  const contract_id = url.searchParams.get("contract_id");
  const assigned_to = url.searchParams.get("assigned_to");

  let query = supabase
    .from("approval_requests")
    .select("*, submitted_by_profile:profiles!approval_requests_submitted_by_fkey(name), deliverable:sow_deliverables(title), contract:contracts(title, status)")
    .eq("organisation_id", profile.organisation_id)
    .order("created_at", { ascending: false });

  // Brand role only sees approvals assigned to them
  if (profile.role === "brand") {
    query = query.eq("assigned_to", user.id);
  }

  if (status) query = query.eq("status", status);
  if (sow_id) query = query.eq("sow_id", sow_id);
  if (contract_id) query = query.eq("contract_id", contract_id);
  if (assigned_to) query = query.eq("assigned_to", assigned_to);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ approvals: data ?? [] });
}
