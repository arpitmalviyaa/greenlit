import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

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

  const { data, error } = await supabase
    .from("deal_rooms")
    .select("*")
    .eq("organisation_id", profile.organisation_id)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ rooms: data ?? [] });
}

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
    creator_id?: string;
    counterparty_name?: string;
    contract_id?: string;
    title: string;
    jurisdiction?: string;
  };

  if (!body.title?.trim()) {
    return NextResponse.json({ error: "title is required" }, { status: 400 });
  }
  if (body.contract_id) {
    const { data: contract } = await supabase
      .from("contracts")
      .select("id")
      .eq("id", body.contract_id)
      .eq("organisation_id", profile.organisation_id)
      .single();
    if (!contract) return NextResponse.json({ error: "Contract not found" }, { status: 404 });
  }

  const service = await createServiceClient();
  const { data, error } = await service
    .from("deal_rooms")
    .insert({
      organisation_id: profile.organisation_id,
      creator_id: body.creator_id ?? null,
      counterparty_name: body.counterparty_name?.trim() || null,
      contract_id: body.contract_id ?? null,
      title: body.title.trim(),
      jurisdiction: body.jurisdiction ?? "IN",
      created_by: user.id,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ room: data });
}
