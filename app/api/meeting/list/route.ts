import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase.from("profiles").select("organisation_id").eq("id", user.id).single();
  if (!profile?.organisation_id) return NextResponse.json({ error: "No organisation" }, { status: 403 });

  const { data } = await supabase
    .from("meeting_transcripts")
    .select("id, title, meeting_date, participants, created_at, analysis_json")
    .eq("organisation_id", profile.organisation_id)
    .order("meeting_date", { ascending: false });

  return NextResponse.json(data ?? []);
}
