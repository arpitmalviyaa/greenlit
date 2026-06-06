import { createServiceClient } from "@/lib/supabase/server";

type Feature =
  | "content_scan"
  | "counsel_upload"
  | "all_counsel_tools"
  | "send_scanner"
  | "nda_scanner"
  | "sow"
  | "scope"
  | "delivery"
  | "approvals"
  | "deals"
  | "whitelisting"
  | "rights"
  | "passport"
  | "playbook"
  | "meeting_counsel"
  | "cross_reference"
  | "adversary_lens"
  | "ai_risk"
  | "crisis_room";

const PLAN_FEATURES: Record<string, Feature[]> = {
  free: ["content_scan", "counsel_upload"],
  pro: [
    "content_scan", "counsel_upload", "all_counsel_tools",
    "send_scanner", "nda_scanner",
  ],
  agency: [
    "content_scan", "counsel_upload", "all_counsel_tools",
    "send_scanner", "nda_scanner", "sow", "scope", "delivery",
    "approvals", "deals", "whitelisting", "rights", "passport", "playbook",
  ],
  enterprise: [
    "content_scan", "counsel_upload", "all_counsel_tools",
    "send_scanner", "nda_scanner", "sow", "scope", "delivery",
    "approvals", "deals", "whitelisting", "rights", "passport", "playbook",
    "meeting_counsel", "cross_reference", "adversary_lens", "ai_risk", "crisis_room",
  ],
};

const MINIMUM_PLAN: Record<Feature, string> = {
  content_scan: "free",
  counsel_upload: "free",
  all_counsel_tools: "pro",
  send_scanner: "pro",
  nda_scanner: "pro",
  sow: "agency",
  scope: "agency",
  delivery: "agency",
  approvals: "agency",
  deals: "agency",
  whitelisting: "agency",
  rights: "agency",
  passport: "agency",
  playbook: "agency",
  meeting_counsel: "enterprise",
  cross_reference: "enterprise",
  adversary_lens: "enterprise",
  ai_risk: "enterprise",
  crisis_room: "enterprise",
};

export async function checkPlanAccess(
  organisationId: string,
  feature: Feature
): Promise<{ allowed: boolean; minimum_plan?: string }> {
  try {
    const serviceClient = await createServiceClient();
    const { data: sub } = await serviceClient
      .from("organisation_subscriptions")
      .select("plan_id, status")
      .eq("organisation_id", organisationId)
      .single();

    if (!sub || !["active", "trialing"].includes(sub.status)) {
      return { allowed: PLAN_FEATURES.free.includes(feature), minimum_plan: MINIMUM_PLAN[feature] };
    }

    const { data: plan } = await serviceClient
      .from("subscription_plans")
      .select("name")
      .eq("id", sub.plan_id)
      .single();

    const planName = (plan?.name as string) ?? "free";
    const allowed = PLAN_FEATURES[planName]?.includes(feature) ?? false;

    return {
      allowed,
      minimum_plan: allowed ? undefined : MINIMUM_PLAN[feature],
    };
  } catch {
    return { allowed: true }; // fail open so existing users aren't locked out on errors
  }
}
