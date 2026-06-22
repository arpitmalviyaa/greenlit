import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { Clock, CheckCircle2, RotateCcw, XCircle } from "lucide-react";

interface ApprovalRow {
  id: string;
  title: string;
  status: string;
  sow_id: string | null;
  created_at: string;
}

const STATUS_BADGE: Record<string, string> = {
  pending: "bg-yellow-900/40 text-yellow-400",
  approved: "bg-green-900/40 text-green-400",
  rejected: "bg-red-900/40 text-red-400",
  revision_requested: "bg-orange-900/40 text-orange-400",
};

export default async function BrandDashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("organisation_id, name")
    .eq("id", user.id)
    .single();

  if (!profile) redirect("/login");

  const { data: approvals } = await supabase
    .from("approval_requests")
    .select("id, title, status, sow_id, created_at")
    .eq("organisation_id", profile.organisation_id)
    .eq("assigned_to", user.id)
    .order("created_at", { ascending: false });

  const list = (approvals ?? []) as ApprovalRow[];
  const pending = list.filter((a) => a.status === "pending").length;
  const approved = list.filter((a) => a.status === "approved").length;
  const revisions = list.filter((a) => a.status === "revision_requested").length;

  return (
    <div className="p-6 min-h-screen bg-slate-950 text-slate-100">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Brand Portal</h1>
        <p className="text-slate-400 mt-1">Welcome, {profile.name ?? "Brand User"}</p>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-yellow-900/20 border border-yellow-800/50 rounded-xl p-4 flex items-center gap-3">
          <Clock className="w-8 h-8 text-yellow-400 flex-shrink-0" />
          <div>
            <p className="text-2xl font-bold text-white">{pending}</p>
            <p className="text-sm text-yellow-300">Pending</p>
          </div>
        </div>
        <div className="bg-green-900/20 border border-green-800/50 rounded-xl p-4 flex items-center gap-3">
          <CheckCircle2 className="w-8 h-8 text-green-400 flex-shrink-0" />
          <div>
            <p className="text-2xl font-bold text-white">{approved}</p>
            <p className="text-sm text-green-300">Approved</p>
          </div>
        </div>
        <div className="bg-orange-900/20 border border-orange-800/50 rounded-xl p-4 flex items-center gap-3">
          <RotateCcw className="w-8 h-8 text-orange-400 flex-shrink-0" />
          <div>
            <p className="text-2xl font-bold text-white">{revisions}</p>
            <p className="text-sm text-orange-300">Revisions</p>
          </div>
        </div>
      </div>

      {/* Approval list */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-white">Approval Requests Assigned to You</h2>
        <Link href="/brand/approvals" className="text-sm text-green-400 hover:underline">
          View all →
        </Link>
      </div>

      {list.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center text-slate-500">
          No approval requests assigned to you yet.
        </div>
      ) : (
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 text-xs">
                <th className="text-left px-4 py-3 font-medium">Title</th>
                <th className="text-left px-4 py-3 font-medium">SOW</th>
                <th className="text-left px-4 py-3 font-medium">Status</th>
                <th className="text-left px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {list.map((ap) => (
                <tr key={ap.id} className="hover:bg-slate-800/50 transition-colors">
                  <td className="px-4 py-3 text-white font-medium">{ap.title}</td>
                  <td className="px-4 py-3 text-slate-400">
                    {ap.sow_id ? ap.sow_id.slice(0, 8) + "…" : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${STATUS_BADGE[ap.status] ?? "bg-slate-700 text-slate-300"}`}>
                      {ap.status === "approved" && <CheckCircle2 className="w-3 h-3" />}
                      {ap.status === "rejected" && <XCircle className="w-3 h-3" />}
                      {ap.status === "revision_requested" && <RotateCcw className="w-3 h-3" />}
                      {ap.status === "pending" && <Clock className="w-3 h-3" />}
                      {ap.status.replace("_", " ")}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-400">
                    {new Date(ap.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link href="/brand/approvals" className="text-xs text-green-400 hover:underline">
                      Review →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
