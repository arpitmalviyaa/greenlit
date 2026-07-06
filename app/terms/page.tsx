import type { Metadata } from "next";
import { MarketingShell } from "@/components/marketing/shell";

export const metadata: Metadata = {
  title: "Terms — Greenlit",
  description: "Terms of service for Greenlit.",
};

const TERMS: Array<{ label: string; body: string }> = [
  {
    label: "The service",
    body: "Greenlit provides AI-assisted review of contracts and campaign content. Greenlit is not a law firm, and its output is not legal advice — it is not a substitute for a lawyer when a matter genuinely needs one.",
  },
  {
    label: "Your account",
    body: "You are responsible for the accuracy of what you upload and for keeping your account credentials secure. Workspace data belongs to your organisation.",
  },
  {
    label: "Data",
    body: "How we handle your documents — including that they never train AI models — is described on the Security page. Delete your account and workspace data is removed from production systems.",
  },
  {
    label: "Contact",
    body: "Questions about these terms: hello@getgreenlit.in.",
  },
];

export default function TermsPage() {
  return (
    <MarketingShell closer={false}>
      <section className="max-w-3xl mx-auto px-5 pt-16 pb-24 md:pt-24">
        <h1 className="font-[family-name:var(--font-display)] text-[#111] font-medium tracking-[-0.01em] leading-[1.05] text-4xl sm:text-5xl">
          Terms of service.
        </h1>
        <div className="mt-12">
          {TERMS.map((t) => (
            <div key={t.label} className="border-t border-[#111]/10 py-8">
              <p className="ed-label text-[#111]/45">{t.label}</p>
              <p className="ed-body mt-3 text-[#111]/70 !text-[1.0625rem]">{t.body}</p>
            </div>
          ))}
        </div>
      </section>
    </MarketingShell>
  );
}
