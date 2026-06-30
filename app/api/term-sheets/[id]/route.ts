import { NextResponse } from "next/server";
import { internalError } from "@/lib/api/errors";
import { createClient } from "@/lib/supabase/server";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase.from("profiles").select("organisation_id").eq("id", user.id).single();
  if (!profile?.organisation_id) return NextResponse.json({ error: "No organisation" }, { status: 403 });

  const { data } = await supabase
    .from("term_sheets")
    .select("*")
    .eq("id", id)
    .eq("organisation_id", profile.organisation_id)
    .single();

  if (!data) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(data);
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase.from("profiles").select("organisation_id, role").eq("id", user.id).single();
  if (!profile?.organisation_id) return NextResponse.json({ error: "No organisation" }, { status: 403 });
  if (profile.role !== "agency_admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json() as { status?: string };
  const validStatuses = ["draft", "shared", "accepted", "rejected"];
  if (!body.status || !validStatuses.includes(body.status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("term_sheets")
    .update({ status: body.status as "draft" | "shared" | "accepted" | "rejected" })
    .eq("id", id)
    .eq("organisation_id", profile.organisation_id)
    .select()
    .single();

  if (error) return internalError("app/api/term-sheets/[id]/route.ts", { message: error.message });
  return NextResponse.json(data);
}
