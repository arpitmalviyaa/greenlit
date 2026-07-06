"use client";

// Moment 2 — pinned scroll demo. As the user scrolls through the section, the
// contract on the left gets progressively annotated while the right column
// steps through "What Greenlit saw → Why it matters → What to say back".

import { useEffect, useRef, useState } from "react";
import { Copy } from "lucide-react";

const STEPS = [
  {
    tag: "What Greenlit saw",
    title: "Exclusivity runs 24 months, all categories",
    body: "The clause locks you out of every brand in every category for two years — far past the campaign window.",
  },
  {
    tag: "Why it matters",
    title: "That's two years of income from other deals",
    body: "Exclusivity is normally limited to direct competitors during the campaign. Broad exclusivity is only worth it if the fee covers what you'd give up.",
  },
  {
    tag: "What to say back",
    title: "Ask for competitor-only, campaign-window exclusivity",
    body: "Copy the wording below into your reply — polite, specific, and the standard market position.",
    wording:
      "We're happy to offer exclusivity against direct competitors in the skincare category for the campaign period plus 30 days. Broader or longer exclusivity would need to be priced separately.",
  },
];

export function StickyDemo() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [step, setStep] = useState(0);
  const [copied, setCopied] = useState(false);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    setReduced(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    let raf = 0;
    function onScroll() {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const el = wrapRef.current;
        if (!el) return;
        const rect = el.getBoundingClientRect();
        const total = rect.height - window.innerHeight;
        const progress = Math.min(1, Math.max(0, -rect.top / Math.max(1, total)));
        setStep(Math.min(STEPS.length - 1, Math.floor(progress * STEPS.length)));
      });
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf);
    };
  }, []);

  async function copyWording() {
    try {
      await navigator.clipboard.writeText(STEPS[2].wording!);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* no clipboard */ }
  }

  // Reduced motion: no pinning, all steps stacked statically
  if (reduced) {
    return (
      <section className="max-w-6xl mx-auto px-5 py-20 space-y-8">
        <h2 className="font-[family-name:var(--font-display)] text-3xl md:text-4xl font-bold text-[#111] tracking-tight">
          Watch it read a contract.
        </h2>
        {STEPS.map((s) => (
          <StepCard key={s.tag} step={s} active copied={copied} onCopy={copyWording} />
        ))}
      </section>
    );
  }

  return (
    <section ref={wrapRef} className="relative" style={{ height: "300vh" }}>
      <div className="sticky top-0 min-h-screen flex items-center">
        <div className="max-w-6xl mx-auto px-5 py-16 w-full">
          <h2 className="font-[family-name:var(--font-display)] text-3xl md:text-4xl font-bold text-[#111] tracking-tight mb-10">
            Watch it read a contract.
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
            {/* Left — contract being annotated */}
            <div className="rounded-xl border border-[#111]/10 bg-white/70 p-6 font-mono text-[13px] leading-7 text-[#111]/45">
              <p>
                12.1 During the Term and for a period of{" "}
                <span
                  className={`transition-colors duration-500 rounded px-0.5 ${
                    step >= 0 ? "bg-[#1D9E75]/25 text-[#111]" : ""
                  }`}
                >
                  twenty-four (24) months
                </span>{" "}
                thereafter, the Influencer shall not promote, endorse or appear in any advertising for{" "}
                <span
                  className={`transition-colors duration-500 rounded px-0.5 ${
                    step >= 1 ? "bg-[#1D9E75]/25 text-[#111]" : ""
                  }`}
                >
                  any other brand in any product category
                </span>
                {" "}without the Brand&apos;s prior written consent.
              </p>
              <p className={`mt-4 transition-opacity duration-500 ${step >= 2 ? "opacity-100" : "opacity-30"}`}>
                <span className="inline-block text-[11px] font-sans font-medium bg-[#111] text-[#F5F3EE] rounded-full px-2.5 py-1">
                  Greenlit: ask for competitor-only, campaign-window exclusivity
                </span>
              </p>
            </div>

            {/* Right — the three steps */}
            <div className="space-y-3">
              {STEPS.map((s, i) => (
                <StepCard key={s.tag} step={s} active={i <= step} copied={copied} onCopy={copyWording} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function StepCard({
  step,
  active,
  copied,
  onCopy,
}: {
  step: (typeof STEPS)[number];
  active: boolean;
  copied: boolean;
  onCopy: () => void;
}) {
  return (
    <div
      className={`rounded-xl border p-5 transition-all duration-500 ${
        active ? "border-[#1D9E75]/40 bg-white opacity-100" : "border-[#111]/10 bg-white/40 opacity-40"
      }`}
    >
      <p className="text-[11px] font-medium uppercase tracking-widest text-[#1D9E75]">{step.tag}</p>
      <p className="text-base font-semibold text-[#111] mt-1">{step.title}</p>
      <p className="text-sm text-[#111]/60 mt-1.5">{step.body}</p>
      {step.wording && active && (
        <div className="mt-3 rounded-lg bg-[#F5F3EE] border border-[#111]/10 p-3">
          <p className="text-sm text-[#111]/80">{step.wording}</p>
          <button
            onClick={onCopy}
            className="mt-2 text-xs font-medium text-white bg-[#1D9E75] rounded-md px-3 py-1.5 hover:opacity-90 inline-flex items-center gap-1.5 cursor-pointer"
          >
            <Copy className="w-3.5 h-3.5" />
            {copied ? "Copied ✓" : "Copy this wording"}
          </button>
        </div>
      )}
    </div>
  );
}
