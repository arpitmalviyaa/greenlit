import type { Metadata } from "next";
import Link from "next/link";
import { MarketingShell } from "@/components/marketing/shell";
import { Reveal } from "@/components/marketing/reveal";
import { CheckSquare, Users, Link2, ScrollText } from "lucide-react";

export const metadata: Metadata = {
  title: "Greenlit for Agencies & Talent Managers",
  description:
    "Greenlit reads every contract your creators sign, tells you what to fix, and keeps a record of it all.",
};

const FEATURES = [
  {
    icon: ScrollText,
    title: "Every contract, read properly",
    body: "Upload any contract — brand deals, NDAs, renewals. Greenlit shows you the few terms that actually matter, explains why in plain words, and gives you the exact reply to send back.",
  },
  {
    icon: CheckSquare,
    title: "Approvals in one place",
    body: "All sign-offs land in one queue. One click to approve. Who approved what, and when, is always saved — no more screenshots in WhatsApp groups.",
  },
  {
    icon: Users,
    title: "All your creators' deals in one list",
    body: "Every deal across every creator you manage: the brand, the contract, where it stands, and what's due next. One look tells you everything.",
  },
  {
    icon: Link2,
    title: "A record for the day someone asks",
    body: "Every check is saved with the date, the result, and who approved it. If a brand ever disputes what was agreed, you don't dig through old chats — you open the record.",
  },
];

export default function AgenciesPage() {
  return (
    <MarketingShell>
      <section className="max-w-6xl mx-auto px-5 pt-16 pb-12 md:pt-24">
        <p className="ed-label text-[#111]/45">For agencies &amp; managers</p>
        <h1 className="font-[family-name:var(--font-display)] text-[#111] font-medium tracking-[-0.015em] leading-[1.08] text-4xl sm:text-5xl md:text-[4rem] max-w-4xl mt-4">
          Review every contract before your creators sign.
        </h1>
        <p className="ed-body mt-6 text-[#111]/65">
          Greenlit reads every deal for you, tells you what to fix, and keeps a record of it all.
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
