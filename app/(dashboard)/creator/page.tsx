import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { FileText, Shield, Scale, Eye, AlertCircle } from "lucide-react";

export default async function CreatorDashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("name, organisation_id")
    .eq("id", user.id)
    .single();

  if (!profile) redirect("/login");

  // Contracts assigned to this creator
  const { data: contracts } = await supabase
    .from("contracts")
    .select("id, title, status, risk_score")
    .eq("organisation_id", profile.organisation_id ?? "")
    .order("created_at", { ascending: false })
    .limit(5);

  // Content scans by this creator
  const { data: scans } = await supabase
    .from("content_scans")
    .select("id, content_type, verdict, created_at")
    .eq("created_by", user.id)
    .order("created_at", { ascending: false })
    .limit(5);

  const verdictColor: Record<string, string> = {
    greenlit: "text-green-400",
    caution: "text-yellow-400",
    blocked: "text-red-400",
  };

  return (
    <div className="p-8 text-white">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">Creator Dashboard</h1>
        <p className="text-slate-400 mt-1">Welcome, {profile.name}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {[
          { title: "My Contracts", href: "/creator/contracts", icon: FileText, desc: "View and track your deals" },
          { title: "Content Scanner", href: "/creator/content", icon: Shield, desc: "Scan scripts and captions before posting" },
          { title: "My Rights", href: "/creator/rights", icon: Scale, desc: "Your IP, moral rights, and protections" },
          { title: "Exclusivity", href: "/creator/exclusivity", icon: Eye, desc: "Active brand exclusivity windows" },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <Link key={item.href} href={item.href}>
              <Card className="bg-slate-800 border-slate-700 hover:border-green-700 transition-colors cursor-pointer">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Icon className="w-5 h-5 text-green-400" />
                    <CardTitle className="text-white text-base">{item.title}</CardTitle>
                  </div>
                  <CardDescription className="text-slate-400">{item.desc}</CardDescription>
                </CardHeader>
              </Card>
            </Link>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent contracts */}
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white text-sm font-medium">Recent Contracts</CardTitle>
          </CardHeader>
          <CardContent>
            {!contracts?.length ? (
              <p className="text-slate-500 text-sm">No contracts yet.</p>
            ) : (
              <ul className="space-y-3">
                {contracts.map((c) => (
                  <li key={c.id} className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-slate-200 truncate max-w-[200px]">{c.title}</p>
                      <p className="text-xs text-slate-500 capitalize">{c.status.replace("_", " ")}</p>
                    </div>
                    {c.risk_score !== null && (
                      <span className={`text-sm font-semibold ${c.risk_score > 70 ? "text-red-400" : c.risk_score > 40 ? "text-yellow-400" : "text-green-400"}`}>
                        {c.risk_score}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Recent scans */}
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white text-sm font-medium">Recent Scans</CardTitle>
          </CardHeader>
          <CardContent>
            {!scans?.length ? (
              <p className="text-slate-500 text-sm">No scans yet.</p>
            ) : (
              <ul className="space-y-3">
                {scans.map((s) => (
                  <li key={s.id} className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-slate-200 capitalize">{s.content_type}</p>
                      <p className="text-xs text-slate-500">{new Date(s.created_at).toLocaleDateString()}</p>
                    </div>
                    {s.verdict && (
                      <span className={`text-xs font-medium uppercase ${verdictColor[s.verdict] ?? "text-slate-400"}`}>
                        {s.verdict}
                      </span>
                    )}
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
