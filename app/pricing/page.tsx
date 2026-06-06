import { createServiceClient } from "@/lib/supabase/server";

interface Plan {
  id: string;
  name: string;
  price_inr: number;
  price_usd: number;
  features_json: { modules?: string[] };
  jurisdiction_limit: number;
}

const PLAN_DESCRIPTIONS: Record<string, { tagline: string; highlights: string[] }> = {
  free: {
    tagline: "Get started with content scanning and contract upload.",
    highlights: ["Content Scanner", "Contract Upload", "1 jurisdiction (India)", "AI analysis — Haiku"],
  },
  pro: {
    tagline: "All counsel tools + send scanner + NDA trap detection.",
    highlights: ["Everything in Free", "Full Counsel Suite", "Send Scanner", "NDA Scanner", "2 jurisdictions"],
  },
  agency: {
    tagline: "Full workflow management for growing influencer agencies.",
    highlights: [
      "Everything in Pro",
      "SOW Builder", "Scope Monitor", "Delivery Lock",
      "Approvals & Proof Vault", "Deal Rooms", "Exclusivity Radar",
      "Whitelisting Guard", "Rights Pricing", "Creator Passport",
      "Legal Playbook", "4 jurisdictions",
    ],
  },
  enterprise: {
    tagline: "Complete legal intelligence across all modules and jurisdictions.",
    highlights: [
      "Everything in Agency",
      "Meeting Counsel", "Term Sheets",
      "Legal Notice Triage + Crisis Room",
      "Cross-Reference (multi-jurisdiction)",
      "Adversary Lens", "AI & Vendor Risk",
      "All 7 jurisdictions", "Priority support",
    ],
  },
};

export default async function PricingPage() {
  const serviceClient = await createServiceClient();
  const { data: plans } = await serviceClient
    .from("subscription_plans")
    .select("*")
    .order("price_inr", { ascending: true });

  const planList = (plans ?? []) as Plan[];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-6 py-16">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900">Simple, transparent pricing</h1>
          <p className="text-lg text-gray-500 mt-3">Legal intelligence for influencer agencies. Start free, scale as you grow.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {planList.map((plan) => {
            const info = PLAN_DESCRIPTIONS[plan.name];
            const isHighlighted = plan.name === "agency";
            return (
              <div
                key={plan.id}
                className={`rounded-2xl p-6 space-y-5 ${
                  isHighlighted
                    ? "bg-blue-600 text-white shadow-xl ring-4 ring-blue-300 scale-105"
                    : "bg-white border border-gray-200 text-gray-900"
                }`}
              >
                <div>
                  <h2 className="text-xl font-bold capitalize">{plan.name}</h2>
                  {isHighlighted && <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full font-semibold">Most Popular</span>}
                </div>
                <div>
                  <span className="text-3xl font-bold">
                    {plan.price_inr === 0 ? "Free" : `₹${plan.price_inr}`}
                  </span>
                  {plan.price_inr > 0 && <span className={`text-sm ml-1 ${isHighlighted ? "text-blue-100" : "text-gray-500"}`}>/month</span>}
                </div>
                <p className={`text-sm ${isHighlighted ? "text-blue-100" : "text-gray-500"}`}>{info?.tagline}</p>
                <ul className="space-y-2">
                  {(info?.highlights ?? []).map((h, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <span className={isHighlighted ? "text-white" : "text-green-600"}>✓</span>
                      {h}
                    </li>
                  ))}
                </ul>
                <a
                  href="/login"
                  className={`block text-center py-2.5 px-4 rounded-lg font-semibold text-sm transition-colors ${
                    isHighlighted
                      ? "bg-white text-blue-600 hover:bg-blue-50"
                      : "bg-gray-900 text-white hover:bg-gray-700"
                  }`}
                >
                  {plan.price_inr === 0 ? "Get started free" : "Subscribe"}
                </a>
              </div>
            );
          })}
        </div>

        <div className="mt-10 text-center text-sm text-gray-500">
          <p>Need more jurisdictions? Each additional jurisdiction can be added from your agency dashboard.</p>
          <p className="mt-1">All prices in INR. USD equivalent shown for reference. Billed monthly via Razorpay.</p>
        </div>
      </div>
    </div>
  );
}
