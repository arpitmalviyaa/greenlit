import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ room_id: string }> }
) {
  const { room_id } = await params;
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
    .from("deal_messages")
    .select("*")
    .eq("deal_room_id", room_id)
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ messages: data ?? [] });
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ room_id: string }> }
) {
  const { room_id } = await params;
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
    message_type: string;
    content: string;
    term_json?: object;
  };

  if (!body.content) return NextResponse.json({ error: "content is required" }, { status: 400 });

  const service = await createServiceClient();
  const { data: msg, error } = await service
    .from("deal_messages")
    .insert({
      deal_room_id: room_id,
      sender_id: user.id,
      message_type: (body.message_type as "text" | "term_proposal" | "counter_proposal" | "acceptance" | "rejection") ?? "text",
      content: body.content,
      term_json: body.term_json ? (body.term_json as unknown as Record<string, unknown>) : null,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Auto-analyse if term_proposal
  let analysis = null;
  if (body.message_type === "term_proposal" && body.term_json) {
    try {
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
      const res = await fetch(`${baseUrl}/api/deals/analyse-term`, {
        method: "POST",
        headers: { "Content-Type": "application/json", cookie: req.headers.get("cookie") ?? "" },
        body: JSON.stringify({ deal_room_id: room_id, term_json: body.term_json }),
      });
      const json = await res.json() as { analysis?: object };
      analysis = json.analysis ?? null;
    } catch { /* non-blocking */ }
  }

  return NextResponse.json({ message: msg, analysis });
}
