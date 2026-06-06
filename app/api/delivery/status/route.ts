import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase.from("profiles").select("organisation_id").eq("id", user.id).single();
  if (!profile?.organisation_id) return NextResponse.json({ error: "No organisation" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const sow_id = searchParams.get("sow_id");
  if (!sow_id) return NextResponse.json({ error: "sow_id required" }, { status: 400 });

  const { data } = await supabase
    .from("delivery_locks")
    .select("*")
    .eq("sow_id", sow_id)
    .eq("organisation_id", profile.organisation_id)
    .single();

  return NextResponse.json({ lock: data ?? null });
}
