"use client";

// S2 — the product, on film. Browser-framed muted loop of the real product;
// plays while in view, pauses when scrolled past. Reduced-motion users get
// the poster with native controls instead of autoplay.

import { useEffect, useRef, useState } from "react";
import { Reveal } from "./reveal";

export function Film() {
  const ref = useRef<HTMLVideoElement>(null);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    v.defaultPlaybackRate = 1.25;
    v.playbackRate = 1.25;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setReduced(true);
      return;
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) v.play().catch(() => {});
        else v.pause();
      },
      { threshold: 0 }
    );
    io.observe(v);
    return () => io.disconnect();
  }, []);

  return (
    <section className="max-w-6xl mx-auto px-5 py-20 md:py-28">
      <Reveal>
        <p className="ed-label text-[#111]/45">Two minutes with a contract</p>
        <div className="mt-6 rounded-xl border border-[#111]/10 bg-[#111] shadow-[0_24px_80px_rgba(17,17,17,0.18)] overflow-hidden">
          {/* Browser chrome */}
          <div className="flex items-center gap-2 px-4 py-3 bg-[#1a1a1a] border-b border-white/5">
            <span className="w-2.5 h-2.5 rounded-full bg-white/15" />
            <span className="w-2.5 h-2.5 rounded-full bg-white/15" />
            <span className="w-2.5 h-2.5 rounded-full bg-white/15" />
            <span className="ml-3 text-[11px] text-white/35 font-[family-name:var(--font-ui)]">
              app.getgreenlit.in
            </span>
          </div>
          <video
            ref={ref}
            muted
            loop
            playsInline
            preload="metadata"
            poster="/walkthrough-poster.jpg"
            controls={reduced}
            className="w-full block"
            aria-label="Screen recording of Greenlit analysing a contract: upload, verdict, issues, negotiation wording"
          >
            <source src="/walkthrough.webm" type="video/webm" />
            <source src="/walkthrough.mp4" type="video/mp4" />
          </video>
        </div>
      </Reveal>
    </section>
  );
}
