import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { verdictFromRisk, VERDICT_CHIP, VERDICT_LABEL } from "@/lib/utils/verdict";
import { FileText } from "lucide-react";

export default async function CreatorDealsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("organisation_id")
    .eq("id", user.id)
    .single();

  const { data: contracts } = profile?.organisation_id
    ? await supabase
        .from("contracts")
        .select("id, title, status, risk_score, created_at")
        .eq("organisation_id", profile.organisation_id)
        .order("created_at", { ascending: false })
        .limit(30)
    : { data: [] };

  const rows = contracts ?? [];

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto space-y-4">
      <h1 className="text-lg font-semibold text-gray-900">My Deals</h1>
      {rows.length === 0 ? (
        <div className="border border-dashed border-gray-200 rounded-lg p-10 text-center bg-white">
          <FileText className="w-10 h-10 text-gray-200 mx-auto mb-3" />
          <p className="text-gray-600 font-medium">No deals yet</p>
          <p className="text-sm text-gray-400 mt-1">Contracts you or your agency analyse will show up here.</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {rows.map((c) => {
            const v = verdictFromRisk(c.risk_score);
            return (
              <li key={c.id}>
                <Link
                  href="/agency/contracts"
                  className="block bg-white border border-gray-200 rounded-lg px-4 py-3 hover:border-gray-300"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium text-gray-900 truncate">{c.title}</p>
                    {c.status === "reviewed" && (
                      <span className={`text-[11px] border rounded-full px-2 py-0.5 shrink-0 ${VERDICT_CHIP[v]}`}>
                        {VERDICT_LABEL[v]}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 mt-1">
                    {new Date(c.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                  </p>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
