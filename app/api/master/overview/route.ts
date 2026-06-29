import { NextResponse } from "next/server";
import { internalError } from "@/lib/api/errors";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  const { data: admin } = await supabase.from("platform_admins").select("name").eq("user_id", user.id).single();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { data, error } = await supabase.rpc("platform_creator_overview");
  if (error) return internalError("app/api/master/overview/route.ts", { message: error.message });
  return NextResponse.json({ admin, creators: data ?? [] });
}
