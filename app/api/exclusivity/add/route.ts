import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("organisation_id")
    .eq("id", user.id)
    .single();
  if (!profile?.organisation_id) return NextResponse.json({ error: "No organisation" }, { status: 403 });

  const body = await req.json() as {
    creator_id: string;
    brand_name: string;
    category: string;
    start_date: string;
    end_date: string;
    sow_id?: string;
    notes?: string;
    jurisdiction?: string;
  };

  if (!body.creator_id || !body.brand_name || !body.category || !body.start_date || !body.end_date) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  // Conflict check first
  const { data: conflicts } = await supabase
    .from("exclusivity_records")
    .select("id, brand_name, start_date, end_date")
    .eq("creator_id", body.creator_id)
    .eq("category", body.category)
    .lte("start_date", body.end_date)
    .gte("end_date", body.start_date);

  if ((conflicts?.length ?? 0) > 0) {
    // Insert alert and block
    const service = await createServiceClient();
    await service.from("exclusivity_alerts").insert({
      organisation_id: profile.organisation_id,
      creator_id: body.creator_id,
      conflicting_sow_id: body.sow_id ?? null,
      existing_record_id: conflicts![0].id,
      alert_message: `High-severity conflict: overlapping exclusivity in category "${body.category}"`,
      severity: "high",
    });
    return NextResponse.json(
      { error: "High-severity exclusivity conflict detected. Record not saved.", conflicts },
      { status: 409 }
    );
  }

  const service = await createServiceClient();
  const { data, error } = await service
    .from("exclusivity_records")
    .insert({
      creator_id: body.creator_id,
      brand_name: body.brand_name,
      category: body.category,
      start_date: body.start_date,
      end_date: body.end_date,
      ...(body.sow_id ? { sow_id: body.sow_id } : {}),
      ...(body.notes ? { notes: body.notes } : {}),
      ...(body.jurisdiction ? { jurisdiction: body.jurisdiction } : {}),
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ record: data });
}
