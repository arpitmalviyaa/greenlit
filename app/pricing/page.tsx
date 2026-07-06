import type { Metadata } from "next";
import Link from "next/link";
import { MarketingShell } from "@/components/marketing/shell";
import { Reveal } from "@/components/marketing/reveal";
import { Check } from "lucide-react";

export const metadata: Metadata = {
  title: "Pricing — Greenlit",
  description: "Introductory pricing for creators and agencies. Free live checks to start.",
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
      "Clearance certificates",
      "Deal history & records",
      "Mobile-first check flow",
    ],
    cta: { label: "Get early access", href: "/signup" },
    featured: false,
  },
  {
    name: "Agency",
    price: "₹15,000",
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
    name: "Brand clearance",
    price: "Talk to us",
    period: "",
    tagline: "Campaign-level clearance for brands working with many creators.",
    features: [
      "Campaign clearance links",
      "Certificate verification",
      "Volume content checking",
    ],
    cta: { label: "hello@getgreenlit.in", href: "mailto:hello@getgreenlit.in?subject=Brand%20campaign%20clearance" },
    featured: false,
  },
];

export default function PricingPage() {
  return (
    <MarketingShell>
      <section className="max-w-6xl mx-auto px-5 pt-16 pb-8 md:pt-24 text-center">
        <h1 className="font-[family-name:var(--font-display)] text-[#111] font-bold tracking-tight text-4xl sm:text-5xl">
          Simple, introductory pricing.
        </h1>
        <p className="mt-4 text-lg text-[#111]/60 max-w-xl mx-auto">
          Beta pricing while we onboard early agencies — locked in for a year for everyone who joins
          now. Free live checks on the homepage, no account needed.
        </p>
      </section>

      <section className="max-w-6xl mx-auto px-5 py-10 grid grid-cols-1 md:grid-cols-3 gap-4 items-stretch">
        {PLANS.map((p, i) => (
          <Reveal key={p.name} delay={i * 80} className="h-full">
            <div
              className={`rounded-2xl border p-7 h-full flex flex-col bg-white ${
                p.featured ? "border-[#1D9E75] shadow-[0_1px_24px_rgba(29,158,117,0.12)]" : "border-[#111]/10"
              }`}
            >
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-[#111]">{p.name}</h2>
                {p.featured && (
                  <span className="text-[11px] font-medium bg-[#1D9E75]/10 text-[#157A5B] rounded-full px-2.5 py-1">
                    Most popular
                  </span>
                )}
              </div>
              <p className="mt-4">
                <span className="font-[family-name:var(--font-display)] text-4xl font-bold text-[#111]">{p.price}</span>
                <span className="text-[#111]/40 text-sm">{p.period}</span>
              </p>
              <p className="text-sm text-[#111]/60 mt-2">{p.tagline}</p>
              <ul className="mt-5 space-y-2.5 flex-1">
                {p.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-[#111]/75">
                    <Check className="w-4 h-4 text-[#1D9E75] shrink-0 mt-0.5" />
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                href={p.cta.href}
                className={`mt-7 text-center text-sm font-medium rounded-lg px-5 py-2.5 transition-colors ${
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

      <p className="max-w-6xl mx-auto px-5 pb-16 text-center text-xs text-[#111]/40">
        Introductory beta pricing — subject to change for new customers after launch. Free tier
        includes limited live checks on the homepage.
      </p>
    </MarketingShell>
  );
}
