import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export async function GET(_req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase.from("profiles").select("organisation_id").eq("id", user.id).single();
  if (!profile?.organisation_id) return NextResponse.json({ error: "No organisation" }, { status: 403 });

  const { data, error } = await supabase
    .from("sow_templates")
    .select("id, name, description, category, created_at")
    .eq("organisation_id", profile.organisation_id)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ templates: data ?? [] });
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase.from("profiles").select("organisation_id").eq("id", user.id).single();
  if (!profile?.organisation_id) return NextResponse.json({ error: "No organisation" }, { status: 403 });

  const body = await req.json() as { sow_id: string; name: string; description?: string; category?: string };
  if (!body.sow_id || !body.name) return NextResponse.json({ error: "sow_id and name required" }, { status: 400 });

  // Load original SOW
  const { data: sow } = await supabase
    .from("sows")
    .select("sow_json, sow_deliverables(*), sow_payment_milestones(*)")
    .eq("id", body.sow_id)
    .eq("organisation_id", profile.organisation_id)
    .single();

  if (!sow) return NextResponse.json({ error: "SOW not found" }, { status: 404 });

  // Strip PII from sow_json
  const rawJson = sow.sow_json as Record<string, unknown>;
  const templateJson = {
    ...rawJson,
    parties: {
      brand: { name: "[BRAND_NAME]", address: "[BRAND_ADDRESS]" },
      creator: { handle: "[CREATOR_HANDLE]", legal_name: "[CREATOR_LEGAL_NAME]", address: "[CREATOR_ADDRESS]" },
    },
    deliverables: sow.sow_deliverables ?? [],
    payment_milestones: sow.sow_payment_milestones ?? [],
  };

  const service = await createServiceClient();
  const { data, error } = await service
    .from("sow_templates")
    .insert({
      organisation_id: profile.organisation_id,
      name: body.name,
      description: body.description ?? null,
      category: (body.category ?? "other") as never,
      template_json: templateJson as never,
      created_by: user.id,
    })
    .select("id, name")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ template: data });
}
