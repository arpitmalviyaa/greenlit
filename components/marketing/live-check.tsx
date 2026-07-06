"use client";

// Moment 3 — working paste-box on the homepage. Real verdict inline, full
// report behind signup. Backed by /api/public/live-check (rate limited).

import Link from "next/link";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { track } from "@/lib/analytics";

interface LiveCheckResult {
  verdict?: "greenlit" | "caution" | "blocked";
  headline?: string;
  top_issue?: { issue: string; why_it_matters: string; excerpt: string } | null;
  error?: string;
}

const VERDICT_CHIP: Record<string, { label: string; cls: string }> = {
  greenlit: { label: "Looks good to go", cls: "bg-[#1D9E75] text-white" },
  caution: { label: "Worth a fix first", cls: "bg-amber-500 text-white" },
  blocked: { label: "Hold — material issue", cls: "bg-[#111] text-white" },
};

export function LiveCheck() {
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<LiveCheckResult | null>(null);
  const [error, setError] = useState("");

  async function handleCheck() {
    setLoading(true);
    setError("");
    setResult(null);
    track("live_check_used");
    try {
      const res = await fetch("/api/public/live-check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      const data = await res.json() as LiveCheckResult;
      if (!res.ok) {
        setError(data.error ?? "The check could not finish — try again in a moment.");
        return;
      }
      setResult(data);
    } catch {
      setError("Could not reach the service — try again in a moment.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="max-w-6xl mx-auto px-5 py-20">
      <div className="rounded-2xl border border-[#111]/10 bg-white p-6 md:p-10">
        <h2 className="font-[family-name:var(--font-display)] text-3xl md:text-4xl font-bold text-[#111] tracking-tight">
          Try it right now.
        </h2>
        <p className="text-[#111]/60 mt-2 max-w-lg">
          Paste a caption or a contract clause. Get a real verdict — no account needed.
        </p>

        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-3">
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={5}
              maxLength={1200}
              placeholder='e.g. "Guaranteed results in 7 days! This serum cured my acne completely…" — or paste a clause from a contract'
              className="w-full border border-[#111]/15 rounded-xl px-4 py-3 text-sm text-[#111] bg-[#F5F3EE]/50 focus:outline-none focus:ring-2 focus:ring-[#1D9E75]/50 resize-none leading-relaxed"
            />
            <button
              onClick={handleCheck}
              disabled={loading || content.trim().length < 15}
              className="bg-[#1D9E75] text-white font-medium rounded-lg px-5 py-2.5 text-sm hover:opacity-90 disabled:opacity-40 transition-opacity cursor-pointer"
            >
              {loading ? (
                <span className="inline-flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" />Checking…</span>
              ) : (
                "Check it"
              )}
            </button>
            {error && <p className="text-sm text-amber-700">{error}</p>}
          </div>

          <div>
            {result?.verdict ? (
              <div className="space-y-3">
                <span className={`inline-block text-sm font-medium rounded-full px-3.5 py-1.5 ${VERDICT_CHIP[result.verdict].cls}`}>
                  {VERDICT_CHIP[result.verdict].label}
                </span>
                <p className="text-sm text-[#111]/80">{result.headline}</p>
                {result.top_issue && (
                  <div className="rounded-lg border border-[#111]/10 bg-[#F5F3EE]/60 p-4">
                    <p className="text-sm font-semibold text-[#111]">{result.top_issue.issue}</p>
                    <p className="text-sm text-[#111]/60 mt-1">{result.top_issue.why_it_matters}</p>
                    {result.top_issue.excerpt && (
                      <p className="text-xs text-[#111]/40 italic mt-2">&ldquo;{result.top_issue.excerpt}&rdquo;</p>
                    )}
                  </div>
                )}
                <Link
                  href="/signup"
                  onClick={() => track("signup_start", { from: "live_check" })}
                  className="inline-block text-sm font-medium text-[#111] underline underline-offset-4 hover:text-[#1D9E75] transition-colors"
                >
                  Get the full report — free →
                </Link>
              </div>
            ) : (
              <div className="h-full min-h-[140px] flex items-center justify-center text-sm text-[#111]/30 border border-dashed border-[#111]/10 rounded-xl">
                The verdict lands here.
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
