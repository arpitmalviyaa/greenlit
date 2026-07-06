import { redirect } from "next/navigation";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { MarketingNav } from "@/components/marketing/nav";
import { MarketingFooter } from "@/components/marketing/footer";
import { Hero } from "@/components/marketing/hero";
import { StickyDemo } from "@/components/marketing/sticky-demo";
import { LiveCheck } from "@/components/marketing/live-check";
import { CalmPositioning, PersonaSplit, SecurityStrip, FinalBand } from "@/components/marketing/sections";

export default async function RootPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role, onboarding_done")
      .eq("id", user.id)
      .single();

    if (profile) {
      const destinations: Record<string, string> = {
        agency_admin: profile.onboarding_done ? "/agency" : "/agency/onboarding",
        creator: "/creator",
        manager: "/manager",
        brand: "/brand",
      };
      redirect(destinations[profile.role] ?? "/login");
    }
    redirect("/login");
  }

  // Social proof — real numbers only; hidden below a meaningful threshold
  let waitlistCount = 0;
  try {
    const service = await createServiceClient();
    const { count } = await service.from("early_access").select("id", { count: "exact", head: true });
    waitlistCount = count ?? 0;
  } catch { /* strip simply hides */ }

  return (
    <div className="bg-[#F5F3EE] min-h-screen">
      <MarketingNav />
      <main>
        <Hero />
        {waitlistCount >= 25 && (
          <div className="border-y border-[#111]/5">
            <p className="max-w-6xl mx-auto px-5 py-4 text-sm text-[#111]/50">
              {waitlistCount.toLocaleString("en-IN")} agencies and creators on the early-access list
            </p>
          </div>
        )}
        <StickyDemo />
        <LiveCheck />
        <CalmPositioning />
        <PersonaSplit />
        <SecurityStrip />
        <FinalBand />
      </main>
      <MarketingFooter />
    </div>
  );
}
