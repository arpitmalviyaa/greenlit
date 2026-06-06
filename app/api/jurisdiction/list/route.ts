import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { JURISDICTION_MAP, JURISDICTIONS } from "@/lib/utils/jurisdictions";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const { data, error } = await supabase
    .from("organisation_jurisdictions")
    .select("*")
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const enriched = (data ?? []).map((row) => ({
    ...row,
    ...(JURISDICTION_MAP[row.jurisdiction_code as keyof typeof JURISDICTION_MAP] ?? {}),
  }));

  return NextResponse.json({ jurisdictions: enriched, all: JURISDICTIONS });
}
