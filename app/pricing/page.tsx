import type { Metadata } from "next";
import Link from "next/link";
import { MarketingShell } from "@/components/marketing/shell";
import { Reveal } from "@/components/marketing/reveal";
import { Check } from "lucide-react";

export const metadata: Metadata = {
  title: "Pricing — Greenlit",
  description: "Pricing for creators, agencies and brand clearance.",
};

const PLANS = [
  {
    name: "Creator",
    price: "₹999",
    period: "/month",
    tagline: "For individual creators who sign their own deals.",
    features: [
      "Unlimited contract analyses",
      "Unlimited content checks",
      "Dated clearance records",
      "Deal history & records",
      "Mobile-first check flow",
    ],
    cta: { label: "Get early access", href: "/signup" },
    featured: false,
  },
  {
    name: "Agency",
    price: "₹8,799",
    period: "/month",
    tagline: "For agencies and talent managers running a roster.",
    features: [
      "Everything in Creator",
      "Team seats & roster view",
      "Approvals workflow with audit trail",
      "Campaign clearance links for brands",
      "NDA scanning & version compare",
      "Priority support",
    ],
    cta: { label: "Get early access", href: "/signup" },
    featured: true,
  },
  {
    name: "Enterprise",
    price: "Custom",
    period: "",
    tagline: "For brands and large agencies working with many creators at once. Talk to our team about clearing entire campaigns, higher volumes, and getting your whole team on board.",
    features: [
      "Clearance across a whole campaign",
      "Verify any clearance record you're sent",
      "High-volume content checking",
      "Dedicated onboarding & support",
    ],
    cta: { label: "Contact sales", href: "mailto:hello@getgreenlit.in?subject=Greenlit%20Enterprise" },
    featured: false,
  },
];

export default function PricingPage() {
  return (
    <MarketingShell>
      <section className="max-w-6xl mx-auto px-5 pt-16 pb-8 md:pt-24 text-center">
        <h1 className="font-[family-name:var(--font-ui)] text-[#111] font-semibold tracking-tight leading-[1.05] text-4xl sm:text-5xl">
          Pricing
        </h1>
      </section>

      <section className="max-w-6xl mx-auto px-5 py-10 pb-24 grid grid-cols-1 md:grid-cols-3 gap-4 items-stretch">
        {PLANS.map((p, i) => (
          <Reveal key={p.name} delay={i * 60} className="h-full">
            <div
              className={`rounded-2xl border p-7 h-full flex flex-col bg-white transition-transform duration-200 hover:-translate-y-0.5 ${
                p.featured ? "border-[#1D9E75] shadow-[0_1px_24px_rgba(29,158,117,0.12)]" : "border-[#111]/10"
              }`}
            >
              <p className="ed-label text-[#111]/45">{p.name}</p>
              <p className="mt-5">
                <span className="font-[family-name:var(--font-ui)] text-4xl font-semibold tracking-tight text-[#111]">{p.price}</span>
                <span className="text-[#111]/40 text-sm">{p.period}</span>
              </p>
              <p className="text-sm text-[#111]/60 mt-3 leading-relaxed">{p.tagline}</p>
              <ul className="mt-6 space-y-2.5 flex-1 border-t border-[#111]/10 pt-6">
                {p.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-[#111]/75">
                    <Check className="w-4 h-4 text-[#1D9E75] shrink-0 mt-0.5" />
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                href={p.cta.href}
                className={`mt-7 text-center text-sm font-medium rounded-md px-5 py-2.5 transition-colors duration-200 ${
                  p.featured
                    ? "bg-[#1D9E75] text-white hover:opacity-90"
                    : "border border-[#111]/15 text-[#111] hover:bg-[#111]/5"
                }`}
              >
                {p.cta.label}
              </Link>
            </div>
          </Reveal>
        ))}
      </section>
    </MarketingShell>
  );
}
