import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { FileText, Shield, Package, CheckSquare, AlertTriangle, TrendingUp } from "lucide-react";

export default async function AgencyDashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("organisation_id, name")
    .eq("id", user.id)
    .single();

  if (!profile?.organisation_id) redirect("/agency/onboarding");

  const orgId = profile.organisation_id;

  // Section 1: Stats — parallel fetch
  const [
    sowsRes,
    approvalsRes,
    scopeAlertsRes,
    exclusivityRes,
    noticesRes,
    invoicesRes,
    timelineRes,
    subRes,
    jursRes,
  ] = await Promise.all([
    supabase.from("sows").select("id", { count: "exact", head: true }).eq("organisation_id", orgId).eq("status", "active"),
    supabase.from("approval_requests").select("id", { count: "exact", head: true }).eq("organisation_id", orgId).eq("status", "pending"),
    supabase.from("scope_alerts").select("id", { count: "exact", head: true }).eq("organisation_id", orgId).eq("resolved", false),
    supabase.from("exclusivity_records").select("id", { count: "exact", head: true }).eq("organisation_id", orgId).eq("status", "active"),
    supabase.from("legal_notices").select("id", { count: "exact", head: true }).eq("organisation_id", orgId).eq("resolved", false),
    supabase.from("invoices").select("total_amount").eq("organisation_id", orgId).eq("status", "sent"),
    supabase.from("evidence_timeline").select("id, event_type, title, created_at, actor:profiles(name)").eq("organisation_id", orgId).order("created_at", { ascending: false }).limit(10),
    supabase.from("organisation_subscriptions").select("status, current_period_end, plan_id, subscription_plans(name, jurisdiction_limit)").eq("organisation_id", orgId).maybeSingle(),
    supabase.from("organisation_jurisdictions").select("jurisdiction_code").eq("organisation_id", orgId),
  ]);

  const pendingInvoicesTotal = (invoicesRes.data ?? []).reduce((sum, inv) => sum + (Number(inv.total_amount) || 0), 0);

  const stats = {
    activeSows: sowsRes.count ?? 0,
    pendingApprovals: approvalsRes.count ?? 0,
    openScopeAlerts: scopeAlertsRes.count ?? 0,
    activeExclusivity: exclusivityRes.count ?? 0,
    unresolvedNotices: noticesRes.count ?? 0,
    pendingInvoicesTotal,
  };

  const sub = subRes.data as {
    status: string;
    current_period_end: string | null;
    plan_id: string;
    subscription_plans: { name: string; jurisdiction_limit: number } | null;
  } | null;
  const activeJurs = (jursRes.data ?? []).map((j) => j.jurisdiction_code);
  const planName = sub?.subscription_plans?.name ?? "free";
  const jurLimit = sub?.subscription_plans?.jurisdiction_limit ?? 1;

  const timelineEvents = (timelineRes.data ?? []) as Array<{
    id: string;
    event_type: string;
    title: string;
    actor: Array<{ name: string | null }>;
    created_at: string;
  }>;

  return (
    <div className="p-6 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Agency Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">Welcome back, {profile.name ?? "Agency Admin"}</p>
      </div>

      {/* Section 1 — Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <StatCard label="Active SOWs" value={stats.activeSows} colour="blue" />
        <StatCard label="Pending Approvals" value={stats.pendingApprovals} colour="amber" />
        <StatCard label="Open Scope Alerts" value={stats.openScopeAlerts} colour="orange" />
        <StatCard label="Active Exclusivity" value={stats.activeExclusivity} colour="purple" />
        <StatCard label="Open Notices" value={stats.unresolvedNotices} colour="red" />
        <StatCard label="Pending Invoices" value={`₹${Math.round(stats.pendingInvoicesTotal / 1000)}k`} colour="green" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Section 2 — Subscription */}
        <div className="bg-white border border-gray-200 rounded-lg p-5 space-y-4">
          <h2 className="font-semibold text-gray-800 text-sm">Subscription</h2>
          <div className="flex items-center gap-3">
            <span className="px-3 py-1 bg-blue-600 text-white rounded-full text-sm font-semibold capitalize">{planName}</span>
            {sub?.status && (
              <span className={`px-2 py-0.5 rounded text-xs font-semibold ${sub.status === "active" ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}>
                {sub.status}
              </span>
            )}
          </div>
          <div>
            <p className="text-xs text-gray-500">Jurisdictions</p>
            <p className="text-sm font-semibold text-gray-800">{activeJurs.join(", ") || "IN"} ({activeJurs.length}/{jurLimit})</p>
          </div>
          {sub?.current_period_end && (
            <p className="text-xs text-gray-400">Renews {new Date(sub.current_period_end).toLocaleDateString()}</p>
          )}
          <div className="flex gap-2">
            <Link href="/pricing" className="flex-1 text-center text-xs bg-gray-100 text-gray-700 py-2 rounded-md font-medium hover:bg-gray-200">
              Add Jurisdiction
            </Link>
            {planName !== "enterprise" && (
              <Link href="/pricing" className="flex-1 text-center text-xs bg-blue-600 text-white py-2 rounded-md font-medium hover:bg-blue-700">
                Upgrade Plan
              </Link>
            )}
          </div>
        </div>

        {/* Section 3 — Recent Activity */}
        <div className="lg:col-span-2 bg-white border border-gray-200 rounded-lg p-5">
          <h2 className="font-semibold text-gray-800 text-sm mb-4">Recent Activity</h2>
          <div className="space-y-3">
            {timelineEvents.map((event) => (
              <div key={event.id} className="flex items-start gap-3">
                <div className="shrink-0 w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center mt-0.5">
                  <TrendingUp className="w-3 h-3 text-gray-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-800 truncate">{event.title}</p>
                  <p className="text-xs text-gray-400">
                    {event.actor[0]?.name ?? "System"} · {new Date(event.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))}
            {timelineEvents.length === 0 && <p className="text-xs text-gray-400">No activity yet.</p>}
          </div>
        </div>
      </div>

      {/* Section 4 — Quick Actions */}
      <div>
        <h2 className="font-semibold text-gray-800 text-sm mb-3">Quick Actions</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <QuickAction href="/agency/content" icon={Shield} label="Scan Content" />
          <QuickAction href="/agency/counsel" icon={FileText} label="Upload Contract" />
          <QuickAction href="/agency/sow" icon={Package} label="New SOW" />
          <QuickAction href="/agency/notices" icon={AlertTriangle} label="Triage Notice" />
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, colour }: { label: string; value: number | string; colour: string }) {
  const colours: Record<string, string> = {
    blue: "bg-blue-50 border-blue-200 text-blue-900",
    amber: "bg-amber-50 border-amber-200 text-amber-900",
    orange: "bg-orange-50 border-orange-200 text-orange-900",
    purple: "bg-purple-50 border-purple-200 text-purple-900",
    red: "bg-red-50 border-red-200 text-red-900",
    green: "bg-green-50 border-green-200 text-green-900",
  };
  return (
    <div className={`border rounded-lg p-4 ${colours[colour] ?? "bg-gray-50 border-gray-200"}`}>
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-xs mt-1 opacity-70">{label}</p>
    </div>
  );
}

function QuickAction({ href, icon: Icon, label }: { href: string; icon: React.ComponentType<{ className?: string }>; label: string }) {
  return (
    <Link href={href} className="flex items-center gap-3 bg-white border border-gray-200 rounded-lg p-4 hover:border-blue-400 transition-colors">
      <Icon className="w-5 h-5 text-gray-500" />
      <span className="text-sm font-medium text-gray-800">{label}</span>
    </Link>
  );
}
