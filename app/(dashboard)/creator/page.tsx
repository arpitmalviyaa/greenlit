import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CreatorFourPillars } from "@/components/dashboard/creator-four-pillars";

export default async function CreatorDashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("name, role, organisation_id")
    .eq("id", user.id)
    .single();
  if (!profile?.organisation_id) redirect("/login");

  const { data: contracts, error } = await supabase
    .from("contracts")
    .select("id, title, status, created_at, analysis_json, risk_score, raw_text, file_name, deal_rooms(counterparty_name)")
    .eq("uploaded_by", user.id)
    .eq("organisation_id", profile.organisation_id)
    .order("created_at", { ascending: false });

  const contractIds = (contracts ?? []).map((contract) => contract.id);
  const { data: versions } = contractIds.length
    ? await supabase
        .from("contract_versions")
        .select("id, contract_id, version_number, file_name, comparison_json, created_at")
        .in("contract_id", contractIds)
        .order("version_number", { ascending: false })
    : { data: [] };

  return (
    <CreatorFourPillars
      userName={profile.name}
      userRole={profile.role}
      initialContracts={error ? [] : contracts ?? []}
      initialVersions={versions ?? []}
    />
  );
}
