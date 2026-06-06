import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase.from("profiles").select("organisation_id").eq("id", user.id).single();
  if (!profile?.organisation_id) return NextResponse.json({ error: "No organisation" }, { status: 403 });

  const { data } = await supabase
    .from("ip_records")
    .select("id, title, ip_type, registration_number, registration_date, expiry_date, jurisdiction, status, created_at")
    .eq("organisation_id", profile.organisation_id)
    .order("created_at", { ascending: false });

  return NextResponse.json(data ?? []);
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase.from("profiles").select("organisation_id").eq("id", user.id).single();
  if (!profile?.organisation_id) return NextResponse.json({ error: "No organisation" }, { status: 403 });

  const body = await req.json() as {
    title?: string;
    ip_type?: string;
    registration_number?: string;
    registration_date?: string;
    expiry_date?: string;
    jurisdiction?: string;
  };

  const serviceClient = await createServiceClient();
  const { data, error } = await serviceClient.from("ip_records").insert({
    organisation_id: profile.organisation_id,
    title: body.title ?? "Untitled IP Asset",
    ip_type: body.ip_type ?? "copyright",
    registration_number: body.registration_number ?? null,
    registration_date: body.registration_date ?? null,
    expiry_date: body.expiry_date ?? null,
    jurisdiction: body.jurisdiction ?? "IN",
    status: "active",
    created_by: user.id,
  }).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
