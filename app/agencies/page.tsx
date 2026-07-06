import type { Metadata } from "next";
import Link from "next/link";
import { MarketingShell } from "@/components/marketing/shell";
import { Reveal } from "@/components/marketing/reveal";
import { CheckSquare, Users, Link2, ScrollText } from "lucide-react";

export const metadata: Metadata = {
  title: "Greenlit for Agencies & Talent Managers",
  description:
    "Every contract across your roster, read the same careful way. Approvals, audit trail, and campaign clearance links for brands.",
};

const FEATURES = [
  {
    icon: ScrollText,
    title: "One careful read, every contract",
    body: "Upload any deal — brand agreements, NDAs, renewals. Greenlit surfaces the few terms that matter, why they matter commercially, and the exact wording to send back. Your juniors negotiate like your seniors.",
  },
  {
    icon: CheckSquare,
    title: "Approvals that move",
    body: "Content and contract sign-offs land in one queue with one-click approve. No more screenshots in WhatsApp groups — who approved what, and when, is always on record.",
  },
  {
    icon: Users,
    title: "Your whole roster in view",
    body: "Deals across every creator you manage in one list: brand, creator, contract, status, next date. The state of the book in one glance.",
  },
  {
    icon: Link2,
    title: "Clearance links brands can open",
    body: "Send a brand a clearance certificate for checked content — a clean, shareable link. No brand logins, no portal to manage.",
  },
];

export default function AgenciesPage() {
  return (
    <MarketingShell>
      <section className="max-w-6xl mx-auto px-5 pt-16 pb-12 md:pt-24">
        <h1 className="font-[family-name:var(--font-display)] text-[#111] font-bold tracking-tight leading-[1.05] text-4xl sm:text-5xl md:text-6xl max-w-3xl">
          Your roster&apos;s contracts, read like a senior manager reads them.
        </h1>
        <p className="mt-5 text-lg text-[#111]/60 max-w-xl">
          Greenlit gives agencies and talent managers one careful, consistent read of every deal —
          and the paper trail to prove it.
        </p>
        <Link
          href="/signup"
          className="inline-block mt-8 bg-[#1D9E75] text-white font-medium rounded-lg px-6 py-3 hover:opacity-90 transition-opacity"
        >
          Get early access
        </Link>
      </section>

      <section className="max-w-6xl mx-auto px-5 py-12 grid grid-cols-1 md:grid-cols-2 gap-4">
        {FEATURES.map((f, i) => (
          <Reveal key={f.title} delay={i * 60}>
            <div className="rounded-2xl border border-[#111]/10 bg-white p-7 h-full">
              <f.icon className="w-6 h-6 text-[#1D9E75] mb-3" />
              <h2 className="text-lg font-semibold text-[#111]">{f.title}</h2>
              <p className="text-sm text-[#111]/60 mt-2 leading-relaxed">{f.body}</p>
            </div>
          </Reveal>
        ))}
      </section>
    </MarketingShell>
  );
}
