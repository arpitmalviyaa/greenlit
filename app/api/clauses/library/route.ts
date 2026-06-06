import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export async function GET(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase.from("profiles").select("organisation_id").eq("id", user.id).single();
  if (!profile?.organisation_id) return NextResponse.json({ error: "No organisation" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const clause_type = searchParams.get("clause_type");
  const jurisdiction = searchParams.get("jurisdiction");
  const approved = searchParams.get("approved");

  let query = supabase
    .from("clause_library")
    .select("id, clause_name, clause_type, jurisdiction, risk_level, notes, approved, created_at")
    .eq("organisation_id", profile.organisation_id)
    .order("created_at", { ascending: false });

  if (clause_type) query = query.eq("clause_type", clause_type);
  if (jurisdiction) query = query.eq("jurisdiction", jurisdiction);
  if (approved === "true") query = query.eq("approved", true);

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
    clause_name?: string;
    clause_type?: string;
    clause_text?: string;
    jurisdiction?: string;
    risk_level?: string;
    notes?: string;
    analysis_json?: Record<string, unknown>;
  };

  const serviceClient = await createServiceClient();
  const { data, error } = await serviceClient.from("clause_library").insert({
    organisation_id: profile.organisation_id,
    clause_name: body.clause_name ?? "Untitled",
    clause_type: (body.clause_type ?? "other") as "exclusivity" | "payment" | "ip_ownership" | "indemnity" | "termination" | "usage_rights" | "confidentiality" | "dispute_resolution" | "governing_law" | "other",
    clause_text: body.clause_text ?? "",
    jurisdiction: body.jurisdiction ?? "IN",
    risk_level: (body.risk_level ?? "standard") as "standard" | "favourable" | "unfavourable" | "red_line",
    notes: body.notes ?? null,
    analysis_json: body.analysis_json ?? null,
    approved: false,
    created_by: user.id,
  }).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
