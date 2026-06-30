import { NextResponse } from "next/server";
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
  const creatorId = url.searchParams.get("creator_id");

  let query = supabase
    .from("rights_valuations")
    .select("*")
    .eq("organisation_id", profile.organisation_id)
    .order("created_at", { ascending: false });

  if (creatorId) query = query.eq("creator_id", creatorId);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ valuations: data ?? [] });
}
