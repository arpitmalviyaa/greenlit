import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/dashboard/sidebar";
import type { UserRole } from "@/types/database.types";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, name, organisation_id, onboarding_done")
    .eq("id", user.id)
    .single();

  // No profile = new user who hasn't completed onboarding yet.
  // Redirecting to /login here would create a loop because middleware
  // sends authenticated users from /login straight back to /agency.
  if (!profile) redirect("/onboarding");

  let orgName = "Greenlit";
  let planName = "free";
  if (profile.organisation_id) {
    const [{ data: org }, { data: sub }] = await Promise.all([
      supabase.from("organisations").select("name").eq("id", profile.organisation_id).single(),
      supabase
        .from("organisation_subscriptions")
        .select("subscription_plans(name)")
        .eq("organisation_id", profile.organisation_id)
        .maybeSingle(),
    ]);
    if (org) orgName = org.name;
    const planRow = sub as { subscription_plans: { name: string } | null } | null;
    if (planRow?.subscription_plans?.name) planName = planRow.subscription_plans.name;
  }

  return (
    <div className="flex min-h-screen bg-black">
      <Sidebar
        role={profile.role as UserRole}
        orgName={orgName}
        userName={profile.name}
        planName={planName}
      />
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}
