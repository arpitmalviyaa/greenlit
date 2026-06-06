import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { BarChart3, FileText, CheckSquare, Package, MessageSquare, Clock } from "lucide-react";

export default async function ManagerDashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("name, organisation_id")
    .eq("id", user.id)
    .single();

  if (!profile) redirect("/login");

  const orgId = profile.organisation_id ?? "";

  const [campaigns, approvals] = await Promise.all([
    supabase
      .from("campaigns")
      .select("id, title, brand_name, status")
      .eq("organisation_id", orgId)
      .eq("manager_id", user.id)
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("approvals")
      .select("id, title, type, status")
      .eq("organisation_id", orgId)
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  return (
    <div className="p-8 text-white">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">Manager Dashboard</h1>
        <p className="text-slate-400 mt-1">Welcome, {profile.name}</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
        {[
          { title: "Campaigns", href: "/manager/campaigns", icon: BarChart3, desc: "Your assigned campaigns" },
          { title: "Contracts", href: "/manager/contracts", icon: FileText, desc: "Review and manage deals" },
          { title: "Approvals", href: "/manager/approvals", icon: CheckSquare, desc: "Pending content approvals" },
          { title: "Scope Guard", href: "/manager/scope", icon: Package, desc: "Scope changes and disputes" },
          { title: "Comms", href: "/manager/comms", icon: MessageSquare, desc: "Saved messages and meeting notes" },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <Link key={item.href} href={item.href}>
              <Card className="bg-slate-800 border-slate-700 hover:border-green-700 transition-colors cursor-pointer h-full">
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2">
                    <Icon className="w-5 h-5 text-green-400" />
                    <CardTitle className="text-white text-sm">{item.title}</CardTitle>
                  </div>
                  <CardDescription className="text-slate-400 text-xs">{item.desc}</CardDescription>
                </CardHeader>
              </Card>
            </Link>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white text-sm font-medium">My Campaigns</CardTitle>
          </CardHeader>
          <CardContent>
            {!campaigns.data?.length ? (
              <p className="text-slate-500 text-sm">No campaigns assigned yet.</p>
            ) : (
              <ul className="space-y-3">
                {campaigns.data.map((c) => (
                  <li key={c.id} className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-slate-200">{c.title}</p>
                      <p className="text-xs text-slate-500">{c.brand_name}</p>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      c.status === "active" ? "bg-green-900/50 text-green-400" :
                      c.status === "disputed" ? "bg-red-900/50 text-red-400" :
                      "bg-slate-700 text-slate-400"
                    }`}>
                      {c.status}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-yellow-400" />
              <CardTitle className="text-white text-sm font-medium">
                Pending Approvals ({approvals.data?.length ?? 0})
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {!approvals.data?.length ? (
              <p className="text-slate-500 text-sm">All clear — no pending approvals.</p>
            ) : (
              <ul className="space-y-3">
                {approvals.data.map((a) => (
                  <li key={a.id} className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-slate-200 truncate max-w-[220px]">{a.title}</p>
                      <p className="text-xs text-slate-500 capitalize">{a.type.replace("_", " ")}</p>
                    </div>
                    <span className="text-xs bg-yellow-900/50 text-yellow-400 px-2 py-0.5 rounded-full">
                      pending
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
