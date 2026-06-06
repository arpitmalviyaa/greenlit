import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase.from("profiles").select("organisation_id, role").eq("id", user.id).single();
  if (!profile?.organisation_id) return NextResponse.json({ error: "No organisation" }, { status: 403 });
  if (profile.role !== "agency_admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json() as { plan_id?: string };
  if (!body.plan_id) return NextResponse.json({ error: "plan_id is required" }, { status: 400 });

  const RAZORPAY_KEY = process.env.RAZORPAY_KEY_ID ?? "";
  const RAZORPAY_SECRET = process.env.RAZORPAY_KEY_SECRET ?? "";

  if (!RAZORPAY_KEY || !RAZORPAY_SECRET) {
    return NextResponse.json({ error: "Razorpay not configured" }, { status: 503 });
  }

  const { data: plan } = await supabase
    .from("subscription_plans")
    .select("name, price_inr")
    .eq("id", body.plan_id)
    .single();

  if (!plan) return NextResponse.json({ error: "Plan not found" }, { status: 404 });

  // Create Razorpay subscription via REST API
  const credentials = Buffer.from(`${RAZORPAY_KEY}:${RAZORPAY_SECRET}`).toString("base64");
  const razorpayRes = await fetch("https://api.razorpay.com/v1/subscriptions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Basic ${credentials}`,
    },
    body: JSON.stringify({
      plan_id: `plan_${plan.name}`, // placeholder — configure real plan IDs in Razorpay dashboard
      quantity: 1,
      total_count: 12,
      notify_info: {
        notify_phone: "",
        notify_email: user.email ?? "",
      },
    }),
  });

  let subscription_id = `local_${Date.now()}`;
  let short_url = "";

  if (razorpayRes.ok) {
    const rzSub = await razorpayRes.json() as { id: string; short_url?: string };
    subscription_id = rzSub.id;
    short_url = rzSub.short_url ?? "";
  }

  const serviceClient = await createServiceClient();
  await serviceClient.from("organisation_subscriptions").upsert({
    organisation_id: profile.organisation_id,
    plan_id: body.plan_id,
    razorpay_subscription_id: subscription_id,
    status: "trialing",
    current_period_start: new Date().toISOString(),
    current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
  }, { onConflict: "organisation_id" });

  await serviceClient.from("billing_events").insert({
    organisation_id: profile.organisation_id,
    event_type: "subscription_created",
    metadata_json: { plan_name: plan.name, plan_id: body.plan_id },
  });

  return NextResponse.json({ subscription_id, razorpay_key_id: RAZORPAY_KEY, short_url });
}
