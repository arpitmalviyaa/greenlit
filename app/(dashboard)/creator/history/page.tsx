import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ShieldCheck, Award } from "lucide-react";
import { VERDICT_CHIP, VERDICT_LABEL, type Verdict } from "@/lib/utils/verdict";

export default async function CreatorHistoryPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("organisation_id")
    .eq("id", user.id)
    .single();

  const { data: scans } = profile?.organisation_id
    ? await supabase
        .from("content_scans")
        .select("id, content_type, verdict, created_at")
        .eq("organisation_id", profile.organisation_id)
        .order("created_at", { ascending: false })
        .limit(50)
    : { data: [] };

  const rows = scans ?? [];

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto space-y-4">
      <h1 className="text-lg font-semibold text-gray-900">History</h1>
      {rows.length === 0 ? (
        <div className="border border-dashed border-gray-200 rounded-lg p-10 text-center bg-white">
          <ShieldCheck className="w-10 h-10 text-gray-200 mx-auto mb-3" />
          <p className="text-gray-600 font-medium">No checks yet</p>
          <p className="text-sm text-gray-400 mt-1">Your content checks and certificates will show up here.</p>
          <Link
            href="/creator"
            className="inline-block mt-4 text-sm font-medium bg-[#1D9E75] text-white rounded-md px-4 py-2 hover:opacity-90"
          >
            Run a check
          </Link>
        </div>
      ) : (
        <ul className="space-y-2">
          {rows.map((s) => {
            const v: Verdict = s.verdict === "blocked" ? "hold" : s.verdict === "caution" ? "negotiate" : "safe";
            return (
              <li key={s.id} className="bg-white border border-gray-200 rounded-lg px-4 py-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium text-gray-900 capitalize">{s.content_type} check</p>
                  <span className={`text-[11px] border rounded-full px-2 py-0.5 shrink-0 ${VERDICT_CHIP[v]}`}>
                    {VERDICT_LABEL[v]}
                  </span>
                </div>
                <div className="flex items-center justify-between mt-1">
                  <p className="text-xs text-gray-400">
                    {new Date(s.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                  </p>
                  {s.verdict === "greenlit" && (
                    <Link
                      href={`/certificate/${s.id}`}
                      target="_blank"
                      className="text-xs text-[#157A5B] inline-flex items-center gap-1 hover:underline"
                    >
                      <Award className="w-3.5 h-3.5" /> Certificate
                    </Link>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
