import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Briefcase } from "lucide-react";

// Deals — a lightweight list of active engagements. Replaces the room-style
// negotiation UI (see FEATURE_FLAGS.md, dealRooms).
export default async function DealsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("organisation_id")
    .eq("id", user.id)
    .single();
  if (!profile?.organisation_id) redirect("/agency/onboarding");

  const { data: deals } = await supabase
    .from("deal_rooms")
    .select("id, title, status, updated_at, creator:profiles!deal_rooms_creator_id_fkey(name)")
    .eq("organisation_id", profile.organisation_id)
    .order("updated_at", { ascending: false })
    .limit(50);

  const rows = (deals ?? []).map((d) => {
    const creator = d.creator as { name: string | null } | Array<{ name: string | null }> | null;
    const creatorName = Array.isArray(creator) ? creator[0]?.name : creator?.name;
    return { ...d, creatorName: creatorName ?? "—" };
  });

  return (
    <div className="p-6 max-w-5xl space-y-5">
      <h1 className="text-lg font-semibold text-gray-900">Deals</h1>

      {rows.length === 0 ? (
        <div className="border border-dashed border-gray-200 rounded-lg p-12 text-center">
          <Briefcase className="w-10 h-10 text-gray-200 mx-auto mb-3" />
          <p className="text-gray-600 font-medium">No deals yet</p>
          <p className="text-sm text-gray-400 mt-1">
            Deals appear here once you analyse a contract and start an engagement.
          </p>
          <Link
            href="/agency/contracts"
            className="inline-block mt-4 text-sm font-medium bg-[#1D9E75] text-white rounded-md px-4 py-2 hover:opacity-90"
          >
            Analyse a contract
          </Link>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left text-xs text-gray-400 uppercase tracking-wide">
                <th className="px-5 py-3 font-medium">Deal</th>
                <th className="px-5 py-3 font-medium">Creator</th>
                <th className="px-5 py-3 font-medium">Contract</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium">Updated</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {rows.map((d) => (
                <tr key={d.id} className="hover:bg-gray-50/50">
                  <td className="px-5 py-3 text-gray-900 font-medium">{d.title}</td>
                  <td className="px-5 py-3 text-gray-600">{d.creatorName}</td>
                  <td className="px-5 py-3">
                    <Link href="/agency/contracts" className="text-[#157A5B] hover:underline">
                      View contracts
                    </Link>
                  </td>
                  <td className="px-5 py-3">
                    <span className="text-xs border border-gray-200 rounded-full px-2.5 py-1 text-gray-600 capitalize">
                      {String(d.status).replace("_", " ")}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-gray-400 text-xs">
                    {new Date(d.updated_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
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
