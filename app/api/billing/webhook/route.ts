import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import * as crypto from "crypto";

export async function POST(req: Request) {
  const body = await req.text();
  const signature = req.headers.get("X-Razorpay-Signature") ?? "";
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET ?? "";
  const requestId = req.headers.get("x-request-id") ?? crypto.randomUUID();
  const errorId = () => crypto.randomUUID();

  if (!webhookSecret) {
    console.error("billing_webhook_not_configured", { request_id: requestId, error_id: errorId() });
    return NextResponse.json({ ok: false, code: "WEBHOOK_NOT_CONFIGURED" }, { status: 503 });
  }

  const expectedSig = crypto
    .createHmac("sha256", webhookSecret)
    .update(body)
    .digest("hex");
  if (!safeEqual(expectedSig, signature)) {
    console.warn("billing_webhook_signature_mismatch", { request_id: requestId, error_id: errorId() });
    return NextResponse.json({ ok: false }, { status: 200 });
  }

  let event: { event: string; payload?: Record<string, unknown> };
  try {
    event = JSON.parse(body) as typeof event;
  } catch {
    return NextResponse.json({ ok: false }, { status: 200 });
  }

  const serviceClient = await createServiceClient();

  try {
    const payload = event.payload ?? {};
    const sub = (payload.subscription as { entity?: { id?: string } })?.entity;
    const payment = (payload.payment as { entity?: { amount?: number; currency?: string } })?.entity;

    // Resolve org from razorpay_subscription_id
    const getOrg = async (subId: string) => {
      const { data } = await serviceClient
        .from("organisation_subscriptions")
        .select("organisation_id")
        .eq("razorpay_subscription_id", subId)
        .maybeSingle();
      return data?.organisation_id ?? null;
    };

    if (event.event === "subscription.activated" && sub?.id) {
      const orgId = await getOrg(sub.id as string);
      if (orgId) {
        await serviceClient.from("organisation_subscriptions")
          .update({ status: "active" })
          .eq("razorpay_subscription_id", sub.id);
      }
    } else if (event.event === "payment.captured" && sub?.id) {
      const orgId = await getOrg(sub.id as string);
      if (orgId) {
        await serviceClient.from("billing_events").insert({
          organisation_id: orgId,
          event_type: "payment_success",
          amount: payment?.amount ? Number(payment.amount) / 100 : null,
          currency: (payment?.currency as string) ?? "INR",
          razorpay_event_id: event.event,
        });
      }
    } else if (event.event === "payment.failed" && sub?.id) {
      const orgId = await getOrg(sub.id as string);
      if (orgId) {
        await serviceClient.from("organisation_subscriptions")
          .update({ status: "past_due" })
          .eq("razorpay_subscription_id", sub.id);
        await serviceClient.from("billing_events").insert({
          organisation_id: orgId,
          event_type: "payment_failed",
          razorpay_event_id: event.event,
        });
      }
    } else if (event.event === "subscription.cancelled" && sub?.id) {
      const orgId = await getOrg(sub.id as string);
      if (orgId) {
        await serviceClient.from("organisation_subscriptions")
          .update({ status: "cancelled" })
          .eq("razorpay_subscription_id", sub.id);
        await serviceClient.from("billing_events").insert({
          organisation_id: orgId,
          event_type: "subscription_cancelled",
          razorpay_event_id: event.event,
        });
      }
    }
  } catch (err) {
    console.error("billing_webhook_processing_failed", {
      request_id: requestId,
      error_id: errorId(),
      message: err instanceof Error ? err.message : "unknown error",
    });
    // Still return 200 — never let webhook errors cascade
  }

  return NextResponse.json({ ok: true }, { status: 200 });
}

function safeEqual(expected: string, actual: string): boolean {
  const left = Buffer.from(expected);
  const right = Buffer.from(actual);
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}
