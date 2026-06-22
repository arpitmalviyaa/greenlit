import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

async function authorised() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase.from("platform_admins").select("user_id").eq("user_id", user.id).single();
  return data ? user : null;
}

export async function GET() {
  if (!await authorised()) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const service = await createServiceClient();
  const { data, error } = await service.from("jurisdiction_corpus")
    .select("id, jurisdiction_code, content_type, title, source, source_url, last_updated, created_at")
    .order("created_at", { ascending: false }).limit(100);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function POST(request: Request) {
  if (!await authorised()) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const body = await request.json() as {
    title?: string; content?: string; content_type?: string; source?: string; source_url?: string; jurisdiction_code?: string;
  };
  if (!body.title?.trim() || !body.content?.trim() || !body.source?.trim()) {
    return NextResponse.json({ error: "Title, content, and source are required" }, { status: 400 });
  }
  const service = await createServiceClient();
  const { data, error } = await service.from("jurisdiction_corpus").insert({
    title: body.title.trim(),
    content: body.content.trim(),
    content_type: body.content_type ?? "judgment",
    source: body.source.trim(),
    source_url: body.source_url?.trim() || null,
    jurisdiction_code: body.jurisdiction_code ?? "IN",
    last_updated: new Date().toISOString(),
  }).select("id, title, content_type, source, jurisdiction_code, created_at").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}

export async function DELETE(request: Request) {
  if (!await authorised()) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  const service = await createServiceClient();
  const { error } = await service.from("jurisdiction_corpus").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ deleted: true });
}
