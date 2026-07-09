import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/corpus/admin";
import { CorpusAdmin } from "@/components/admin/corpus-admin";

// Founder-only. Non-admins get a 404 (surface is invisible, not merely forbidden).
export const metadata = { title: "Corpus — Greenlit", robots: { index: false } };

export default async function CorpusAdminPage() {
  if (!await requireAdmin()) notFound();
  return <CorpusAdmin />;
}
