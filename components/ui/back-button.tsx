"use client";

// In-app back button — mirrors the browser back button so users don't have to
// reach for Safari/Chrome's. Uses history where possible; falls back to a given
// href (or the app home) on a fresh tab with no history to go back to.
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

export function BackButton({ fallback = "/", className = "" }: { fallback?: string; className?: string }) {
  const router = useRouter();
  function goBack() {
    // history.length <= 1 means this was the first page in the tab.
    if (typeof window !== "undefined" && window.history.length > 1) router.back();
    else router.push(fallback);
  }
  return (
    <button
      type="button"
      onClick={goBack}
      aria-label="Go back"
      className={`inline-flex items-center gap-1.5 rounded-lg border border-white/15 px-3 py-1.5 text-sm text-zinc-300 transition-colors hover:border-white/30 hover:text-white ${className}`}
    >
      <ArrowLeft className="h-4 w-4" /> Back
    </button>
  );
}
