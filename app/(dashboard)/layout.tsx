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
  if (!profile) redirect("/agency/onboarding");

  let orgName = "Greenlit";
  if (profile.organisation_id) {
    const { data: org } = await supabase
      .from("organisations")
      .select("name")
      .eq("id", profile.organisation_id)
      .single();
    if (org) orgName = org.name;
  }

  return (
    <div className="flex min-h-screen bg-black">
      <Sidebar
        role={profile.role as UserRole}
        orgName={orgName}
        userName={profile.name}
      />
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}
