import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function SettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("organisation_id, name, role")
    .eq("id", user.id)
    .single();
  if (!profile?.organisation_id) redirect("/onboarding");

  const [{ data: org }, { data: sub }, { data: jurs }] = await Promise.all([
    supabase.from("organisations").select("name, slug").eq("id", profile.organisation_id).single(),
    supabase
      .from("organisation_subscriptions")
      .select("status, current_period_end, subscription_plans(name, jurisdiction_limit)")
      .eq("organisation_id", profile.organisation_id)
      .maybeSingle(),
    supabase.from("organisation_jurisdictions").select("jurisdiction_code").eq("organisation_id", profile.organisation_id),
  ]);

  const subRow = sub as {
    status: string;
    current_period_end: string | null;
    subscription_plans: { name: string; jurisdiction_limit: number } | null;
  } | null;
  const planName = subRow?.subscription_plans?.name ?? "free";
  const jurLimit = subRow?.subscription_plans?.jurisdiction_limit ?? 1;
  const activeJurs = (jurs ?? []).map((j) => j.jurisdiction_code);

  return (
    <div className="p-6 max-w-3xl space-y-6">
      <h1 className="text-lg font-semibold text-gray-900">Settings</h1>

      <section className="bg-white border border-gray-200 rounded-lg p-5 space-y-3">
        <h2 className="font-semibold text-gray-800 text-sm">Workspace</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-xs text-gray-500">Organisation</p>
            <p className="font-medium text-gray-900">{org?.name}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Your account</p>
            <p className="font-medium text-gray-900">{profile.name}</p>
            <p className="text-xs text-gray-400">{user.email}</p>
          </div>
        </div>
      </section>

      <section className="bg-white border border-gray-200 rounded-lg p-5 space-y-4">
        <h2 className="font-semibold text-gray-800 text-sm">Plan &amp; billing</h2>
        <div className="flex items-center gap-3">
          <span className="px-3 py-1 bg-gray-900 text-white rounded-full text-sm font-semibold capitalize">{planName}</span>
          {subRow?.status && (
            <span className={`px-2 py-0.5 rounded text-xs font-semibold ${subRow.status === "active" ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}>
              {subRow.status}
            </span>
          )}
        </div>
        <div>
          <p className="text-xs text-gray-500">Jurisdictions</p>
          <p className="text-sm font-semibold text-gray-800">
            {activeJurs.join(", ") || "IN"} ({activeJurs.length || 1}/{jurLimit})
          </p>
        </div>
        {subRow?.current_period_end && (
          <p className="text-xs text-gray-400">Renews {new Date(subRow.current_period_end).toLocaleDateString()}</p>
        )}
        <div className="flex gap-2">
          <Link href="/pricing" className="text-center text-xs bg-gray-100 text-gray-700 px-4 py-2 rounded-md font-medium hover:bg-gray-200">
            Add jurisdiction
          </Link>
          {planName !== "enterprise" && (
            <Link href="/pricing" className="text-center text-xs bg-[#1D9E75] text-white px-4 py-2 rounded-md font-medium hover:opacity-90">
              Upgrade plan
            </Link>
          )}
        </div>
      </section>
    </div>
  );
}
