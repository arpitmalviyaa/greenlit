"use client";

// S1 — opening statement. Full viewport, one line, one CTA.
// Single rise-and-settle entrance; no stagger theatrics.

import Link from "next/link";
import { track } from "@/lib/analytics";

export function Hero() {
  return (
    <section className="min-h-[calc(100svh-4rem)] flex items-center">
      <div className="max-w-6xl mx-auto px-5 py-20 w-full">
        <div className="ed-enter">
          <h1 className="font-[family-name:var(--font-display)] text-[#111] font-medium tracking-[-0.02em] leading-[1.05] text-[clamp(2.75rem,8vw,6rem)] max-w-5xl">
            Stop signing contracts you haven&apos;t{" "}
            <em className="text-[#1D9E75]">really</em> read.
          </h1>
          <p className="ed-body mt-8 text-[#111]/65">
            Greenlit reads the deal the way an experienced manager would — the verdict, the few
            terms that matter, and the exact words to say back.
          </p>
          <Link
            href="/signup"
            onClick={() => track("hero_cta_click")}
            className="inline-block mt-10 bg-[#111] text-[#F5F3EE] text-sm font-medium rounded-md px-7 py-3.5 hover:bg-[#111]/85 transition-colors duration-200"
          >
            Get early access
          </Link>
        </div>
      </div>
    </section>
  );
}
