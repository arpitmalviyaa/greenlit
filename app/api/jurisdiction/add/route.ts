import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { JURISDICTION_MAP } from "@/lib/utils/jurisdictions";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("organisation_id, role")
    .eq("id", user.id)
    .single();

  if (!profile?.organisation_id) {
    return NextResponse.json({ error: "No organisation found" }, { status: 403 });
  }
  if (profile.role !== "agency_admin") {
    return NextResponse.json({ error: "agency_admin only" }, { status: 403 });
  }

  const body = await request.json() as { jurisdiction_code?: string };
  const { jurisdiction_code } = body;

  if (!jurisdiction_code) {
    return NextResponse.json({ error: "jurisdiction_code required" }, { status: 400 });
  }

  const jurisdictionDef = JURISDICTION_MAP[jurisdiction_code as keyof typeof JURISDICTION_MAP];
  if (!jurisdictionDef) {
    return NextResponse.json({ error: "Unknown jurisdiction code" }, { status: 400 });
  }
  if (jurisdictionDef.status === "coming_soon") {
    return NextResponse.json({ error: "This jurisdiction is coming soon and cannot be activated" }, { status: 400 });
  }

  const serviceSupabase = await createServiceClient();
  const { error } = await serviceSupabase
    .from("organisation_jurisdictions")
    .insert({
      organisation_id: profile.organisation_id,
      jurisdiction_code,
      status: "active",
      activated_at: new Date().toISOString(),
    });

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json({ error: "Jurisdiction already added" }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const { data } = await serviceSupabase
    .from("organisation_jurisdictions")
    .select("*")
    .eq("organisation_id", profile.organisation_id)
    .order("created_at", { ascending: true });

  return NextResponse.json({ jurisdictions: data ?? [] }, { status: 201 });
}
