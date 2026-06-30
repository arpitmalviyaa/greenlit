import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ creator_id: string }> }
) {
  const { creator_id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("organisation_id")
    .eq("id", user.id)
    .single();
  if (!profile?.organisation_id) return NextResponse.json({ error: "No organisation" }, { status: 403 });

  const { data, error } = await supabase
    .from("safety_passports")
    .select("*")
    .eq("organisation_id", profile.organisation_id)
    .eq("creator_id", creator_id)
    .single();

  if (error) return NextResponse.json({ passport: null });

  return NextResponse.json({ passport: data });
}
