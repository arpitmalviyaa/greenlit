import type { Metadata } from "next";
import { MarketingShell } from "@/components/marketing/shell";
import { Reveal } from "@/components/marketing/reveal";

export const metadata: Metadata = {
  title: "Security — Greenlit",
  description:
    "How Greenlit handles your contracts: no AI training on your documents, encryption, database-enforced workspace isolation, and DPDPA-aware retention.",
};

// Founder copy — ships verbatim. Do not edit, soften, or expand.
const SECTIONS: Array<{ label: string; title: string; body: string[] }> = [
  {
    label: "AI training",
    title: "Your contracts never train AI models",
    body: [
      "When Greenlit analyses a document, the text is sent to our AI provider (Anthropic) under commercial terms that prohibit training on your data. We log what the analysis cost and how long it took — never the contract text itself.",
      "Your documents exist in exactly two places: your workspace's storage, and the analysis stored against your workspace. Nowhere else.",
    ],
  },
  {
    label: "Workspace isolation",
    title: "Workspace isolation is enforced in the database",
    body: [
      "Every contract, check, approval and certificate belongs to one organisation, and the database itself refuses to serve another organisation's rows — a control called row-level security that applies even if application code has a bug.",
      "We verify this with cross-tenant denial tests: accounts in one workspace attempting to read another workspace's contracts, files and approvals, and being refused at the database layer.",
    ],
  },
  {
    label: "Encryption",
    title: "Encryption",
    body: [
      "All traffic is encrypted in transit with TLS. Documents and data are encrypted at rest by our infrastructure providers (Supabase on AWS).",
    ],
  },
  {
    label: "Retention",
    title: "What we keep, and for how long",
    body: [
      "We keep your contracts and analyses for as long as your account is active, because the history is the point — the record you reach for when a dispute surfaces months later.",
      "Delete your account and workspace data is removed from production systems; residual copies in encrypted backups age out on the backup rotation schedule.",
    ],
  },
  {
    label: "DPDPA",
    title: "India's DPDPA",
    body: [
      "Greenlit is built India-first and processes personal data in line with the Digital Personal Data Protection Act, 2023: purpose-limited processing, consent-based signup, and the right to erasure described above.",
      "For agency data-processing agreements or a security questionnaire, write to hello@getgreenlit.in — we respond quickly.",
    ],
  },
  {
    label: "Access",
    title: "Who can see your data",
    body: [
      "The people in your workspace, and no one else. Greenlit staff do not browse customer contracts; production access is limited to debugging with your consent.",
      "Clearance certificates are the one deliberate exception: each is a public page at an unguessable address showing the verdict, date and a content fingerprint — never the content itself.",
    ],
  },
];

export default function SecurityPage() {
  return (
    <MarketingShell>
      <section className="max-w-3xl mx-auto px-5 pt-16 pb-10 md:pt-24">
        <h1 className="font-[family-name:var(--font-display)] text-[#111] font-medium tracking-[-0.01em] leading-[1.05] text-4xl sm:text-6xl">
          Contracts are sensitive. We built like it.
        </h1>
        <p className="ed-body mt-6 text-[#111]/65">
          Plain-language answers to the questions agencies ask us before they upload their first
          contract.
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
