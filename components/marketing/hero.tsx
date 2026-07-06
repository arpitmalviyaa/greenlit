"use client";

// Moment 1 — hero clause-reveal. On load, green highlights sweep across three
// hidden traps in a real contract paragraph while annotation chips fade in.

import Link from "next/link";
import { useEffect, useState } from "react";
import { track } from "@/lib/analytics";

const CHIPS: Array<{ key: string; label: string }> = [
  { key: "perpetual", label: "Rights never expire" },
  { key: "indemnity", label: "No liability cap" },
  { key: "payment", label: "90-day payment" },
];

export function Hero() {
  const [stage, setStage] = useState(0);

  useEffect(() => {
    // Staggered sweep: trap 1 → 2 → 3 (reduced-motion users see all instantly via CSS)
    const timers = [1, 2, 3].map((i) => setTimeout(() => setStage(i), 600 + i * 700));
    return () => timers.forEach(clearTimeout);
  }, []);

  const trapCls = (i: number) => `mk-trap ${stage >= i ? "mk-in" : ""}`;
  const chipCls = (i: number) =>
    `inline-flex items-center gap-1.5 text-[11px] font-medium bg-[#111] text-[#F5F3EE] rounded-full px-2.5 py-1 transition-opacity duration-500 ${
      stage >= i ? "opacity-100" : "opacity-0"
    }`;

  return (
    <section className="max-w-6xl mx-auto px-5 pt-16 pb-20 md:pt-24 md:pb-28">
      <h1 className="font-[family-name:var(--font-display)] text-[#111] font-bold tracking-tight leading-[1.02] text-4xl sm:text-6xl md:text-7xl max-w-4xl">
        Stop signing contracts you haven&apos;t{" "}
        <em className="text-[#1D9E75] not-italic md:italic">really</em> read.
      </h1>

      <p className="mt-6 text-lg text-[#111]/60 max-w-xl">
        Greenlit reads the deal like an experienced manager would — shows you the three things that
        matter, and hands you the exact words to say back.
      </p>

      <div className="mt-8 flex items-center gap-4">
        <Link
          href="/signup"
          onClick={() => track("hero_cta_click")}
          className="inline-block bg-[#1D9E75] text-white font-medium rounded-lg px-6 py-3 hover:opacity-90 transition-opacity"
        >
          Analyse a contract free
        </Link>
      </div>

      {/* The contract paragraph acting out the product */}
      <div className="mt-14 md:mt-16 max-w-3xl rounded-xl border border-[#111]/10 bg-white/70 p-6 md:p-8">
        <p className="text-[13px] leading-7 text-[#111]/45 font-mono">
          8.2 The Influencer grants the Brand a licence to use all Content{" "}
          <span className={trapCls(1)}>in perpetuity, throughout the universe, in all media now known or hereafter devised</span>{" "}
          <span className={chipCls(1)}>{CHIPS[0].label}</span>. The Influencer shall{" "}
          <span className={trapCls(2)}>indemnify the Brand against any and all claims, losses and expenses of whatever nature, without limitation</span>{" "}
          <span className={chipCls(2)}>{CHIPS[1].label}</span>. Fees shall be payable{" "}
          <span className={trapCls(3)}>within ninety (90) days of the Brand confirming satisfaction at its sole discretion</span>{" "}
          <span className={chipCls(3)}>{CHIPS[2].label}</span>, subject to receipt of a valid invoice.
        </p>
        <p className="mt-4 text-xs text-[#111]/40">
          Three traps, one paragraph. Greenlit found them in seconds.
        </p>
      </div>
    </section>
  );
}
