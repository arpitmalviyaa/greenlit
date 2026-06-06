import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase.from("profiles").select("organisation_id").eq("id", user.id).single();
  if (!profile?.organisation_id) return NextResponse.json({ error: "No organisation" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const ip_record_id = searchParams.get("ip_record_id");
  const status = searchParams.get("status");

  let query = supabase
    .from("infringement_records")
    .select("id, ip_record_id, infringing_url, platform, infringement_type, status, detected_at, analysis_json")
    .eq("organisation_id", profile.organisation_id)
    .order("detected_at", { ascending: false });

  if (ip_record_id) query = query.eq("ip_record_id", ip_record_id);
  if (status) query = query.eq("status", status);

  const { data } = await query;
  return NextResponse.json(data ?? []);
}
