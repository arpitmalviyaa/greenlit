import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { MarketingNav } from "@/components/marketing/nav";
import { MarketingFooter } from "@/components/marketing/footer";
import { Hero } from "@/components/marketing/hero";
import { Film } from "@/components/marketing/film";
import { HowItWorks, Questions, Certificate, CalmPositioning, FinalBand } from "@/components/marketing/sections";

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
        agency_admin: profile.onboarding_done ? "/agency" : "/onboarding",
        creator: "/creator",
        manager: "/manager",
        brand: "/brand",
      };
      redirect(destinations[profile.role] ?? "/login");
    }
    redirect("/login");
  }

  return (
    <div className="bg-[#F5F3EE] min-h-screen">
      <MarketingNav />
      <main>
        <Hero />
        <Film />
        <HowItWorks />
        <Questions />
        <Certificate />
        <CalmPositioning />
        <FinalBand />
      </main>
      <MarketingFooter />
    </div>
  );
}
