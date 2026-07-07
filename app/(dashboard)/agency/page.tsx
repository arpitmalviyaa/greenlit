import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { FileText, ShieldCheck, Upload, Sparkles } from "lucide-react";
import { PendingApprovals, type PendingApproval } from "@/components/dashboard/pending-approvals";
import { verdictFromRisk, VERDICT_CHIP, VERDICT_LABEL } from "@/lib/utils/verdict";

export default async function AgencyDashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("organisation_id, name")
    .eq("id", user.id)
    .single();

  if (!profile?.organisation_id) redirect("/onboarding");
  const orgId = profile.organisation_id;

  const [contractsRes, approvalsRes, scansRes, dealsRes] = await Promise.all([
    supabase
      .from("contracts")
      .select("id, title, status, risk_score, created_at")
      .eq("organisation_id", orgId)
      .order("created_at", { ascending: false })
      .limit(6),
    supabase
      .from("approval_requests")
      .select("id, title, created_at, submitted_by_profile:profiles!approval_requests_submitted_by_fkey(name)")
      .eq("organisation_id", orgId)
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("content_scans")
      .select("id, content_type, verdict, risk_score, created_at")
      .eq("organisation_id", orgId)
      .order("created_at", { ascending: false })
      .limit(4),
    supabase.from("sows").select("id", { count: "exact", head: true }).eq("organisation_id", orgId).eq("status", "active"),
  ]);

  const contracts = contractsRes.data ?? [];
  const scans = scansRes.data ?? [];
  const approvals: PendingApproval[] = (approvalsRes.data ?? []).map((a) => {
    const submitter = a.submitted_by_profile as { name: string | null } | Array<{ name: string | null }> | null;
    const name = Array.isArray(submitter) ? submitter[0]?.name : submitter?.name;
    return { id: a.id, title: a.title, created_at: a.created_at, submitted_by: name ?? "Team member" };
  });

  const isEmpty = contracts.length === 0 && approvals.length === 0 && scans.length === 0;

  if (isEmpty) {
    return (
      <div className="p-6 max-w-4xl space-y-8">
        <h1 className="text-lg font-semibold text-gray-900">Dashboard</h1>

        {/* Two large action cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Link
            href="/agency/contracts"
            className="group border border-gray-200 rounded-xl p-8 bg-white hover:border-[#1D9E75] transition-colors"
          >
            <Upload className="w-8 h-8 text-[#1D9E75] mb-4" />
            <h2 className="text-xl font-semibold text-gray-900">Upload a contract</h2>
            <p className="text-sm text-gray-500 mt-2">
              Get a plain-English read of what you&apos;re signing — what&apos;s standard, what&apos;s worth
              negotiating, and the exact wording to ask for.
            </p>
          </Link>
          <Link
            href="/agency/content-check"
            className="group border border-gray-200 rounded-xl p-8 bg-white hover:border-[#1D9E75] transition-colors"
          >
            <ShieldCheck className="w-8 h-8 text-[#1D9E75] mb-4" />
            <h2 className="text-xl font-semibold text-gray-900">Check content before it goes live</h2>
            <p className="text-sm text-gray-500 mt-2">
              Paste a script, caption or post and get a clear verdict that goes on the record —
              dated, fingerprinted, on file.
            </p>
          </Link>
        </div>

        {/* Sample contract — first value in under 2 minutes */}
        <Link
          href="/agency/contracts?demo=1"
          className="flex items-center gap-3 border border-dashed border-gray-300 rounded-lg px-5 py-4 hover:border-[#1D9E75] transition-colors bg-white"
        >
          <Sparkles className="w-5 h-5 text-[#1D9E75]" />
          <div>
            <p className="text-sm font-medium text-gray-900">Not ready to upload? Analyse a sample contract</p>
            <p className="text-xs text-gray-500">A realistic influencer agreement with a few traps in it — see what Greenlit finds.</p>
          </div>
        </Link>

        {/* How Greenlit works */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            ["1. Upload or paste", "Drop in a contract or a piece of content."],
            ["2. Get a clear read", "A verdict, the few things that matter, and why they matter commercially."],
            ["3. Act on it", "Copy negotiation wording, request changes, or approve and move on."],
          ].map(([title, body]) => (
            <div key={title} className="rounded-lg border border-gray-100 bg-gray-50 p-4">
              <p className="text-sm font-semibold text-gray-800">{title}</p>
              <p className="text-xs text-gray-500 mt-1">{body}</p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Active state — stat cards only for nonzero values
  const stats: Array<[string, number, string]> = [
    ["Contracts analysed", contracts.filter((c) => c.status === "reviewed").length, "/agency/contracts"],
    ["Pending approvals", approvals.length, "/agency/approvals"],
    ["Content checks", scans.length, "/agency/content-check"],
    ["Active deals", dealsRes.count ?? 0, "/agency/deals"],
  ];

  return (
    <div className="p-6 max-w-5xl space-y-6">
      <h1 className="text-lg font-semibold text-gray-900">Dashboard</h1>

      <PendingApprovals approvals={approvals} />

      {/* Recent analyses */}
      {(contracts.length > 0 || scans.length > 0) && (
        <section className="bg-white border border-gray-200 rounded-lg">
          <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-semibold text-gray-800 text-sm">Recent analyses</h2>
            <Link href="/agency/contracts" className="text-xs text-gray-500 hover:text-gray-900">
              View all ›
            </Link>
          </div>
          <ul className="divide-y divide-gray-100">
            {contracts.slice(0, 5).map((c) => {
              const v = verdictFromRisk(c.risk_score);
              return (
                <li key={c.id} className="px-5 py-3 flex items-center gap-3">
                  <FileText className="w-4 h-4 text-gray-400 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900 truncate">{c.title}</p>
                    <p className="text-xs text-gray-400">{new Date(c.created_at).toLocaleDateString()}</p>
                  </div>
                  {c.status === "reviewed" ? (
                    <span className={`text-xs border rounded-full px-2.5 py-1 ${VERDICT_CHIP[v]}`}>{VERDICT_LABEL[v]}</span>
                  ) : (
                    <span className="text-xs border border-gray-200 rounded-full px-2.5 py-1 text-gray-500 capitalize">{c.status}</span>
                  )}
                </li>
              );
            })}
            {scans.slice(0, 3).map((s) => {
              const v = s.verdict === "blocked" ? "hold" : s.verdict === "caution" ? "negotiate" : "safe";
              return (
                <li key={s.id} className="px-5 py-3 flex items-center gap-3">
                  <ShieldCheck className="w-4 h-4 text-gray-400 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900 truncate capitalize">Content check · {s.content_type}</p>
                    <p className="text-xs text-gray-400">{new Date(s.created_at).toLocaleDateString()}</p>
                  </div>
                  <span className={`text-xs border rounded-full px-2.5 py-1 ${VERDICT_CHIP[v as "safe"]}`}>
                    {VERDICT_LABEL[v as "safe"]}
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {/* Stat cards — only nonzero */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {stats
          .filter(([, value]) => value > 0)
          .map(([label, value, href]) => (
            <Link key={label} href={href} className="border border-gray-200 bg-white rounded-lg p-4 hover:border-[#1D9E75] transition-colors">
              <p className="text-2xl font-bold text-gray-900">{value}</p>
              <p className="text-xs mt-1 text-gray-500">{label}</p>
            </Link>
          ))}
      </div>
    </div>
  );
}
