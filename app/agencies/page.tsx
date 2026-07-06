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
        <p className="ed-label text-[#111]/45">For agencies &amp; managers</p>
        <h1 className="font-[family-name:var(--font-display)] text-[#111] font-medium tracking-[-0.015em] leading-[1.08] text-4xl sm:text-5xl md:text-[4rem] max-w-4xl mt-4">
          Your roster&apos;s contracts, read like a senior manager reads them.
        </h1>
        <p className="ed-body mt-6 text-[#111]/65">
          Greenlit gives agencies and talent managers one careful, consistent read of every deal —
          and the paper trail to prove it.
        </p>
        <Link
          href="/signup"
          className="inline-block mt-8 bg-[#111] text-[#F5F3EE] text-sm font-medium rounded-md px-7 py-3.5 hover:bg-[#111]/85 transition-colors duration-200"
        >
          Get early access
        </Link>
      </section>

      <section className="max-w-6xl mx-auto px-5 py-12 pb-24 grid grid-cols-1 md:grid-cols-2 gap-4">
        {FEATURES.map((f, i) => (
          <Reveal key={f.title} delay={i * 60}>
            <div className="rounded-2xl border border-[#111]/10 bg-white p-7 h-full transition-transform duration-200 hover:-translate-y-0.5">
              <f.icon className="w-6 h-6 text-[#1D9E75] mb-4" />
              <h2 className="font-[family-name:var(--font-display)] text-2xl font-medium text-[#111] leading-snug">{f.title}</h2>
              <p className="text-sm text-[#111]/60 mt-3 leading-relaxed">{f.body}</p>
            </div>
          </Reveal>
        ))}
      </section>
    </MarketingShell>
  );
}
