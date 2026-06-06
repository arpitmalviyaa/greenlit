import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function RootPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, onboarding_done")
    .eq("id", user.id)
    .single();

  if (!profile) redirect("/login");

  const destinations: Record<string, string> = {
    agency_admin: profile.onboarding_done ? "/agency" : "/agency/onboarding",
    creator: "/creator",
    manager: "/manager",
    brand: "/brand",
  };

  redirect(destinations[profile.role] ?? "/login");
}
