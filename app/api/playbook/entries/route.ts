import { NextResponse } from "next/server";
import { internalError } from "@/lib/api/errors";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export async function GET(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase.from("profiles").select("organisation_id").eq("id", user.id).single();
  if (!profile?.organisation_id) return NextResponse.json({ error: "No organisation" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const category = searchParams.get("category");
  const jurisdiction = searchParams.get("jurisdiction");

  let query = supabase
    .from("playbook_entries")
    .select("id, title, category, content, jurisdiction, tags, created_at")
    .eq("organisation_id", profile.organisation_id)
    .order("created_at", { ascending: false });

  if (category) query = query.eq("category", category);
  if (jurisdiction) query = query.eq("jurisdiction", jurisdiction);

  const { data } = await query;
  return NextResponse.json(data ?? []);
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase.from("profiles").select("organisation_id, role").eq("id", user.id).single();
  if (!profile?.organisation_id) return NextResponse.json({ error: "No organisation" }, { status: 403 });
  if (profile.role !== "agency_admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json() as {
    title?: string;
    category?: string;
    content?: string;
    jurisdiction?: string;
    tags?: string[];
  };

  const serviceClient = await createServiceClient();
  const { data, error } = await serviceClient.from("playbook_entries").insert({
    organisation_id: profile.organisation_id,
    title: body.title ?? "Untitled",
    category: (body.category ?? "standard_position") as "negotiation_rule" | "red_line" | "standard_position" | "escalation_protocol" | "approved_language" | "jurisdiction_note",
    content: body.content ?? "",
    jurisdiction: body.jurisdiction ?? "IN",
    tags: body.tags ?? [],
    created_by: user.id,
  }).select().single();

  if (error) return internalError("app/api/playbook/entries/route.ts", { message: error.message });
  return NextResponse.json(data);
}
