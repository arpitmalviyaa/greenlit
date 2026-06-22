import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { MasterPortal } from "@/components/master/master-portal";

export default async function MasterPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: admin } = await supabase.from("platform_admins").select("name").eq("user_id", user.id).single();
  if (!admin) redirect("/");
  return <MasterPortal adminName={admin.name} />;
}
