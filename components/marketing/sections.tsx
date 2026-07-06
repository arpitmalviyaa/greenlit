// Static marketing sections: calm-positioning, persona split, security strip,
// final black band. Server components; scroll reveals via <Reveal>.

import Link from "next/link";
import { Reveal } from "./reveal";
import { ShieldCheck, Building2, Smartphone } from "lucide-react";

export function CalmPositioning() {
  const rows: Array<[string, string]> = [
    [
      "“You are legally exposed. Consult a lawyer immediately.”",
      "“This gives the brand broader rights than usual. Here's the wording to ask for instead.”",
    ],
    [
      "“DANGER: clause 8.2 violates standard practice.”",
      "“Common term, but the duration is longer than market norm. You can accept it if the fee justifies it.”",
    ],
    [
      "“We cannot advise on this matter.”",
      "“Consider asking whether this can be limited to the campaign period — here's a polite way to put it.”",
    ],
  ];

  return (
    <section className="max-w-6xl mx-auto px-5 py-20">
      <Reveal>
        <h2 className="font-[family-name:var(--font-display)] text-3xl md:text-4xl font-bold text-[#111] tracking-tight">
          Calm, not alarmist.
        </h2>
        <p className="text-[#111]/60 mt-2 max-w-lg">
          A frightened tool makes every clause sound like a lawsuit. An experienced one tells you what
          to do next.
        </p>
      </Reveal>
      <div className="mt-8 space-y-3">
        {rows.map(([scary, greenlit], i) => (
          <Reveal key={i} delay={i * 80}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="rounded-xl border border-[#111]/10 bg-white/40 p-5">
                <p className="text-[11px] uppercase tracking-widest text-[#111]/35 mb-2">A scary tool says</p>
                <p className="text-sm text-[#111]/50">{scary}</p>
              </div>
              <div className="rounded-xl border border-[#1D9E75]/30 bg-white p-5">
                <p className="text-[11px] uppercase tracking-widest text-[#1D9E75] mb-2">Greenlit says</p>
                <p className="text-sm text-[#111]/80">{greenlit}</p>
              </div>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

export function PersonaSplit() {
  return (
    <section className="max-w-6xl mx-auto px-5 py-20">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Reveal>
          <Link
            href="/agencies"
            className="group block rounded-2xl border border-[#111]/10 bg-white p-8 hover:border-[#1D9E75] transition-colors h-full"
          >
            <Building2 className="w-7 h-7 text-[#1D9E75] mb-4" />
            <h3 className="font-[family-name:var(--font-display)] text-2xl font-bold text-[#111] tracking-tight">
              For agencies &amp; managers
            </h3>
            <p className="text-sm text-[#111]/60 mt-2">
              Every contract across your roster, read the same careful way. Approvals, audit trail,
              and clearance links brands can open without an account.
            </p>
            <p className="text-sm font-medium text-[#1D9E75] mt-4 group-hover:underline underline-offset-4">
              See the agency workflow →
            </p>
          </Link>
        </Reveal>
        <Reveal delay={100}>
          <Link
            href="/creators"
            className="group block rounded-2xl border border-[#111]/10 bg-white p-8 hover:border-[#1D9E75] transition-colors h-full"
          >
            <Smartphone className="w-7 h-7 text-[#1D9E75] mb-4" />
            <h3 className="font-[family-name:var(--font-display)] text-2xl font-bold text-[#111] tracking-tight">
              For creators
            </h3>
            <p className="text-sm text-[#111]/60 mt-2">
              Check a contract or a caption from your phone before you commit. Keep a clean record of
              every deal and every clearance.
            </p>
            <p className="text-sm font-medium text-[#1D9E75] mt-4 group-hover:underline underline-offset-4">
              See the creator flow →
            </p>
          </Link>
        </Reveal>
      </div>
    </section>
  );
}

export function SecurityStrip() {
  const items = [
    "Your contracts never train AI models",
    "Encrypted in transit and at rest",
    "Strict workspace isolation, enforced in the database",
  ];
  return (
    <section className="max-w-6xl mx-auto px-5 pb-20">
      <Reveal>
        <div className="rounded-2xl border border-[#111]/10 bg-white/60 px-6 py-5 flex flex-col md:flex-row md:items-center gap-4">
          <ShieldCheck className="w-6 h-6 text-[#1D9E75] shrink-0" />
          <ul className="flex flex-col md:flex-row gap-2 md:gap-8 text-sm text-[#111]/70 flex-1">
            {items.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
          <Link href="/security" className="text-sm font-medium text-[#111] underline underline-offset-4 hover:text-[#1D9E75] transition-colors shrink-0">
            Read the security page
          </Link>
        </div>
      </Reveal>
    </section>
  );
}

export function FinalBand() {
  return (
    <section className="bg-[#111]">
      <div className="max-w-6xl mx-auto px-5 py-20 md:py-28 text-center">
        <h2 className="font-[family-name:var(--font-display)] text-[#F5F3EE] font-bold tracking-tight text-3xl sm:text-5xl max-w-3xl mx-auto leading-tight">
          Stop signing contracts you haven&apos;t <em className="text-[#1D9E75]">really</em> read.
        </h2>
        <Link
          href="/signup"
          className="inline-block mt-8 bg-[#1D9E75] text-white font-medium rounded-lg px-7 py-3.5 hover:opacity-90 transition-opacity"
        >
          Get early access
        </Link>
      </div>
    </section>
  );
}
