import type { Metadata } from "next";
import { MarketingShell } from "@/components/marketing/shell";
import { LiveCheck } from "@/components/marketing/live-check";

export const metadata: Metadata = {
  title: "Live check — Greenlit",
  description: "Paste a caption or a contract clause and get a real verdict. No account needed.",
  robots: { index: false },
};

// Quiet page, unlinked from primary nav — reachable from For Creators and
// campaign links. Rate limiting lives in /api/public/live-check.
export default function CheckPage() {
  return (
    <MarketingShell closer={false}>
      <div className="pt-8 md:pt-16 pb-8">
        <LiveCheck />
      </div>
    </MarketingShell>
  );
}
