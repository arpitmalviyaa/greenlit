import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

export async function GET() {
  const serviceClient = await createServiceClient();
  const { data } = await serviceClient
    .from("subscription_plans")
    .select("*")
    .order("price_inr", { ascending: true });
  return NextResponse.json(data ?? []);
}
