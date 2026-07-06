import type { Metadata } from "next";
import { MarketingShell } from "@/components/marketing/shell";
import { Reveal } from "@/components/marketing/reveal";

export const metadata: Metadata = {
  title: "Security — Greenlit",
  description:
    "How Greenlit keeps your contracts safe: your documents never train AI, everything is encrypted, and only your workspace can see your data.",
};

const SECTIONS: Array<{ label: string; title: string; body: string[] }> = [
  {
    label: "AI training",
    title: "Your contracts never train AI models",
    body: [
      "When Greenlit reads your document, the text goes to our AI provider (Anthropic) under a commercial agreement that forbids using your data to train AI. We keep a note of what each analysis cost and how long it took — never the contract itself.",
      "Your documents live in exactly two places: your workspace's storage, and the analysis saved to your workspace. Nowhere else.",
    ],
  },
  {
    label: "Workspace isolation",
    title: "Only your workspace can see your data",
    body: [
      "Everything you upload belongs to your workspace, and only your workspace. The database itself refuses to show one company's data to another — a protection that holds even if there's a bug in our app.",
      "We test this regularly: accounts in one workspace try to open another workspace's contracts and files, and the database turns them away every time.",
    ],
  },
  {
    label: "Encryption",
    title: "Everything is encrypted",
    body: [
      "Everything travels over encrypted connections (TLS), and everything we store is encrypted at rest by our infrastructure providers (Supabase on AWS).",
    ],
  },
  {
    label: "Retention",
    title: "What we keep, and for how long",
    body: [
      "We keep your contracts and analyses for as long as your account is active — the history is the point. It's the record you reach for when a dispute comes up months later.",
      "If you delete your account, your data is removed from our systems. Copies inside encrypted backups expire on the normal backup schedule.",
    ],
  },
  {
    label: "DPDPA",
    title: "India's data protection law",
    body: [
      "Greenlit is built in India and handles personal data under India's Digital Personal Data Protection Act, 2023. In plain terms: we only use your data for what you gave it to us for, signup is consent-based, and you can have your data erased, as described above.",
      "Need a data-processing agreement or a security questionnaire filled in? Write to hello@getgreenlit.in — we respond quickly.",
    ],
  },
  {
    label: "Access",
    title: "Who can see your data",
    body: [
      "The people in your workspace — and no one else. Greenlit staff don't browse customer contracts, and we only touch production data to fix a problem, with your consent.",
      "The one exception, by design: clearance records. Each is a public page at an unguessable web address showing the result, the date and a fingerprint of the content — never the content itself.",
    ],
  },
];

export default function SecurityPage() {
  return (
    <MarketingShell>
      <section className="max-w-3xl mx-auto px-5 pt-16 pb-10 md:pt-24">
        <h1 className="font-[family-name:var(--font-display)] text-[#111] font-medium tracking-[-0.01em] leading-[1.05] text-4xl sm:text-6xl">
          Your contracts are safe here.
        </h1>
        <p className="ed-body mt-6 text-[#111]/65">
          Simple answers to the questions agencies ask us before they upload their first contract.
        </p>
      </section>

      <section className="max-w-3xl mx-auto px-5 pb-24">
        {SECTIONS.map((s) => (
          <Reveal key={s.title}>
            <div className="border-t border-[#111]/10 py-10">
              <p className="ed-label text-[#111]/45">{s.label}</p>
              <h2 className="font-[family-name:var(--font-display)] text-[#111] font-medium leading-[1.15] text-2xl md:text-3xl mt-3">
                {s.title}
              </h2>
              {s.body.map((p, j) => (
                <p key={j} className="ed-body mt-4 text-[#111]/70 !text-[1.0625rem]">
                  {p}
                </p>
              ))}
            </div>
          </Reveal>
        ))}
      </section>
    </MarketingShell>
  );
}
