import type { Metadata } from "next";
import Link from "next/link";
import { MarketingShell } from "@/components/marketing/shell";
import { Reveal } from "@/components/marketing/reveal";
import { Smartphone, Award, History } from "lucide-react";

export const metadata: Metadata = {
  title: "Greenlit for Creators",
  description:
    "Check a contract or a caption from your phone before you commit. Shareable clearance certificates and a clean record of every deal.",
};

const FEATURES = [
  {
    icon: Smartphone,
    title: "Check it from your phone",
    body: "Paste a caption, a script, or a contract clause. In under a minute you know if it's fine, what to fix, or what to push back on — with the words ready to send.",
  },
  {
    icon: Award,
    title: "A certificate brands trust",
    body: "When content clears, you get a shareable clearance certificate. Send the link to the brand — professional, verifiable, done.",
  },
  {
    icon: History,
    title: "Every deal on record",
    body: "Your contracts, checks and certificates in one history. When a dispute comes up eight months later, you have the receipts.",
  },
];

export default function CreatorsPage() {
  return (
    <MarketingShell>
      <section className="max-w-6xl mx-auto px-5 pt-16 pb-12 md:pt-24">
        <p className="ed-label text-[#111]/45">For creators</p>
        <h1 className="font-[family-name:var(--font-display)] text-[#111] font-medium tracking-[-0.015em] leading-[1.08] text-4xl sm:text-5xl md:text-[4rem] max-w-4xl mt-4">
          Know before you sign. Know before you post.
        </h1>
        <p className="ed-body mt-6 text-[#111]/65">
          The deal-savvy friend every creator needs — in your pocket, before you commit to anything.
        </p>
        <div className="mt-8 flex flex-wrap items-center gap-5">
          <Link
            href="/signup"
            className="inline-block bg-[#111] text-[#F5F3EE] text-sm font-medium rounded-md px-7 py-3.5 hover:bg-[#111]/85 transition-colors duration-200"
          >
            Get early access
          </Link>
          <Link href="/check" className="ed-link text-sm text-[#111]/70 hover:text-[#1D9E75]">
            Or run a free live check first →
          </Link>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-5 py-12 pb-24 grid grid-cols-1 md:grid-cols-3 gap-4">
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
