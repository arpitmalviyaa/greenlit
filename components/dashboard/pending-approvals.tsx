"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export interface PendingApproval {
  id: string;
  title: string;
  submitted_by: string;
  created_at: string;
}

export function PendingApprovals({ approvals }: { approvals: PendingApproval[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [failed, setFailed] = useState<string | null>(null);

  async function approve(id: string) {
    setBusy(id);
    setFailed(null);
    const res = await fetch("/api/approvals/review", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ approval_id: id, status: "approved" }),
    });
    setBusy(null);
    if (res.ok) {
      router.refresh();
    } else {
      setFailed(id);
    }
  }

  if (approvals.length === 0) return null;

  return (
    <section className="bg-white border border-gray-200 rounded-lg">
      <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
        <h2 className="font-semibold text-gray-800 text-sm">Pending approvals</h2>
        <Link href="/agency/approvals" className="text-xs text-gray-500 hover:text-gray-900">
          View all ›
        </Link>
      </div>
      <ul className="divide-y divide-gray-100">
        {approvals.map((a) => (
          <li key={a.id} className="px-5 py-3 flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-sm text-gray-900 truncate">{a.title}</p>
              <p className="text-xs text-gray-400">
                {a.submitted_by} · {new Date(a.created_at).toLocaleDateString()}
              </p>
            </div>
            {failed === a.id && <span className="text-xs text-amber-700">Could not approve — try again</span>}
            <button
              onClick={() => approve(a.id)}
              disabled={busy === a.id}
              className="text-xs font-medium bg-[#1D9E75] text-white px-3 py-1.5 rounded-md hover:opacity-90 disabled:opacity-50"
            >
              {busy === a.id ? "Approving…" : "Approve"}
            </button>
            <Link
              href="/agency/approvals"
              className="text-xs font-medium border border-gray-200 text-gray-700 px-3 py-1.5 rounded-md hover:bg-gray-50"
            >
              View
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
