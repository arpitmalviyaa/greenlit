// Editorial homepage sections: how-it-works (S3), anticipatory Q&A (S4),
// the certificate (S5), calm-not-alarmist (S6), closing band (S7).
// Server components; scroll reveals via <Reveal>.

import Image from "next/image";
import Link from "next/link";
import { Reveal } from "./reveal";

/* ── S3 — How it works, in three acts ──────────────────────────────────── */

const ACTS: Array<{ n: string; title: string; body: string; still: string; alt: string }> = [
  {
    n: "01",
    title: "Upload the contract.",
    body: "Drop in the agreement the brand sent — the one with forty pages nobody reads to the end. Greenlit reads every clause against thousands of creator and campaign contracts.",
    still: "/still-upload.jpg",
    alt: "Greenlit workspace with a contract uploaded and analysis starting",
  },
  {
    n: "02",
    title: "See what matters — and what to say back.",
    body: "A clear verdict, the few terms that actually move money or rights, and why each one matters commercially. The negotiation wording is written for you — polite, specific, ready to paste.",
    still: "/still-verdict.jpg",
    alt: "Analysis result showing flagged clauses and negotiation wording",
  },
  {
    n: "03",
    title: "Approve, certify, move.",
    body: "Sign off with a record behind it, and issue a clearance certificate the brand can open from a link. Then on to the next deal.",
    still: "/still-certify.jpg",
    alt: "Cleared contract summary ready to sign with confidence",
  },
];

export function HowItWorks() {
  return (
    <section className="max-w-6xl mx-auto px-5 py-20 md:py-28">
      <Reveal>
        <p className="ed-label text-[#111]/45">How it works</p>
      </Reveal>
      <div className="mt-10 space-y-16 md:space-y-20">
        {ACTS.map((a) => (
          <Reveal key={a.n}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-14 items-center border-t border-[#111]/10 pt-10">
              <div>
                <p className="ed-label text-[#1D9E75]">{a.n}</p>
                <h3 className="font-[family-name:var(--font-display)] text-[#111] font-medium tracking-[-0.01em] leading-[1.1] text-3xl md:text-[2.6rem] mt-3">
                  {a.title}
                </h3>
                <p className="ed-body mt-4 text-[#111]/65 !text-[1.0625rem]">{a.body}</p>
              </div>
              <div className="rounded-lg overflow-hidden border border-[#111]/10 shadow-[0_12px_40px_rgba(17,17,17,0.12)]">
                <Image src={a.still} alt={a.alt} width={1920} height={1080} className="w-full block" />
              </div>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

/* ── S4 — Before it asks, answer ───────────────────────────────────────── */

const QA: Array<{ q: string; a: React.ReactNode }> = [
  {
    q: "Why not just use a regular GenAI model?",
    a: (
      <>
        Regular GenAI models are generalists. Greenlit is built for one job, and it keeps your
        record. A general chatbot starts from zero every time and gives a different answer every
        time; Greenlit is purpose-built for creator and campaign contracts — the same structured
        verdict every run, your past contracts and positions remembered as your playbook, and
        records a chat window can&apos;t produce: certificates, approvals, history.
      </>
    ),
  },
  {
    q: "Will it replace our lawyer?",
    a: (
      <>
        No. Greenlit handles the everyday reading and flags the rare thing that genuinely needs
        counsel — so lawyer time is spent where it actually matters.
      </>
    ),
  },
  {
    q: "Is our data safe?",
    a: (
      <>
        Your contracts never train AI models, and workspace isolation is enforced in the database
        itself. The{" "}
        <Link href="/security" className="ed-link text-[#111] hover:text-[#1D9E75]">
          Security page
        </Link>{" "}
        answers this properly, in plain language.
      </>
    ),
  },
  {
    q: "What do we actually get on day one?",
    a: (
      <>
        Upload a live contract and get the verdict and negotiation wording in minutes. Check
        campaign content before it goes live. Issue your first clearance certificate.
      </>
    ),
  },
];

export function Questions() {
  return (
    <section className="max-w-3xl mx-auto px-5 py-20 md:py-28">
      <Reveal>
        <p className="ed-label text-[#111]/45">Questions agencies ask us</p>
      </Reveal>
      <div className="mt-8">
        {QA.map((item) => (
          <Reveal key={item.q}>
            <div className="border-t border-[#111]/10 py-8">
              <h3 className="font-[family-name:var(--font-display)] text-[#111] font-medium leading-[1.15] text-2xl md:text-3xl">
                {item.q}
              </h3>
              <p className="ed-body mt-4 text-[#111]/65 !text-[1.0625rem]">{item.a}</p>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

/* ── S5 — The certificate ──────────────────────────────────────────────── */

export function Certificate() {
  return (
    <section className="bg-[#EFECE4] border-y border-[#111]/5">
      <div className="max-w-6xl mx-auto px-5 py-20 md:py-28 grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
        <Reveal>
          <p className="ed-label text-[#111]/45">The certificate</p>
          <h2 className="font-[family-name:var(--font-display)] text-[#111] font-medium tracking-[-0.01em] leading-[1.1] text-3xl md:text-[2.75rem] mt-4">
            This is what your brand sees.
          </h2>
          <p className="ed-body mt-5 text-[#111]/65 !text-[1.0625rem]">
            When content clears, Greenlit issues a clearance certificate — a clean public page at
            an unguessable address, showing the verdict, the date and a fingerprint of the exact
            content checked. No brand logins, no portal to manage.
          </p>
          <p className="mt-6 font-[family-name:var(--font-display)] italic text-[#1D9E75] text-lg">
            Agencies in the early cohort are already sending these.
          </p>
        </Reveal>
        <Reveal delay={100}>
          {/* Specimen certificate, framed like an object */}
          <div className="bg-white border border-[#111]/10 rounded-2xl p-8 md:p-10 shadow-[0_30px_80px_rgba(17,17,17,0.16)] md:rotate-1">
            <div className="flex items-center justify-between mb-8">
              <span className="text-xl font-bold tracking-tight text-[#1D9E75] font-[family-name:var(--font-display)]">
                greenlit
              </span>
              <span className="ed-label text-[#111]/35 !text-[9px]">Content clearance certificate</span>
            </div>
            <div className="text-center py-4">
              <div className="mx-auto w-14 h-14 rounded-full bg-[#1D9E75]/10 flex items-center justify-center mb-4">
                <svg className="w-7 h-7 text-[#1D9E75]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="font-[family-name:var(--font-display)] text-2xl text-[#111]">Cleared to publish</p>
              <p className="text-sm text-[#111]/50 mt-2">
                This caption passed Greenlit&apos;s compliance check for the Indian market.
              </p>
            </div>
            <dl className="mt-6 space-y-2.5 text-sm border-t border-[#111]/10 pt-5">
              <div className="flex justify-between gap-4">
                <dt className="text-[#111]/40">Checked for</dt>
                <dd className="text-[#111]/80 font-medium">Greenlit workspace</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-[#111]/40">Date</dt>
                <dd className="text-[#111]/80">6 July 2026</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-[#111]/40 shrink-0">Content fingerprint</dt>
                <dd className="text-[#111]/50 font-mono text-[10px] break-all text-right">
                  9f2ac1…e47b0d
                </dd>
              </div>
            </dl>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ── S6 — Calm, not alarmist ───────────────────────────────────────────── */

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
    <section className="max-w-6xl mx-auto px-5 py-20 md:py-28">
      <Reveal>
        <p className="ed-label text-[#111]/45">Tone</p>
        <h2 className="font-[family-name:var(--font-display)] text-[#111] font-medium tracking-[-0.01em] leading-[1.1] text-3xl md:text-[2.75rem] mt-4">
          Calm, not alarmist.
        </h2>
        <p className="ed-body mt-4 text-[#111]/65 !text-[1.0625rem]">
          A frightened tool makes every clause sound like a lawsuit. An experienced one tells you
          what to do next.
        </p>
      </Reveal>
      <div className="mt-10 space-y-3">
        {rows.map(([scary, greenlit], i) => (
          <Reveal key={i} delay={i * 60}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="rounded-xl border border-[#111]/10 bg-white/40 p-6">
                <p className="ed-label text-[#111]/35 !text-[10px] mb-3">A scary tool says</p>
                <p className="text-sm text-[#111]/50">{scary}</p>
              </div>
              <div className="rounded-xl border border-[#1D9E75]/30 bg-white p-6">
                <p className="ed-label text-[#1D9E75] !text-[10px] mb-3">Greenlit says</p>
                <p className="font-[family-name:var(--font-display)] text-lg leading-snug text-[#111]/85">
                  {greenlit}
                </p>
              </div>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

/* ── S7 — Closing band ─────────────────────────────────────────────────── */

export function FinalBand() {
  return (
    <section className="bg-[#101010]">
      <div className="max-w-6xl mx-auto px-5 py-24 md:py-32 text-center">
        <h2 className="font-[family-name:var(--font-display)] text-[#F5F3EE] font-medium tracking-[-0.01em] leading-[1.1] text-4xl sm:text-6xl max-w-4xl mx-auto">
          Stop signing contracts you haven&apos;t <em className="text-[#1D9E75]">really</em> read.
        </h2>
        <Link
          href="/signup"
          className="inline-block mt-10 bg-[#1D9E75] text-white text-sm font-medium rounded-md px-8 py-3.5 hover:opacity-90 transition-opacity duration-200"
        >
          Get early access
        </Link>
      </div>
    </section>
  );
}
