import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/corpus/admin";
import { StartupAdmin } from "@/components/admin/startup-admin";

// Founder-only internal tool. Non-admins get a 404.
export const metadata = { title: "Startup Review — Greenlit", robots: { index: false } };

export default async function StartupAdminPage() {
  if (!await requireAdmin()) notFound();
  return <StartupAdmin />;
}
