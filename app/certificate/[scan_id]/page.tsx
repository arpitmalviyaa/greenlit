import { createHash } from "crypto";
import { notFound } from "next/navigation";
import { createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// Public clearance certificate (the growth loop). Keyed by unguessable scan
// UUID; shows verdict metadata + content hash, never the content itself.
export default async function CertificatePage({ params }: { params: Promise<{ scan_id: string }> }) {
  const { scan_id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(scan_id)) notFound();

  const service = await createServiceClient();
  const { data: scan } = await service
    .from("content_scans")
    .select("id, verdict, content_type, jurisdiction, raw_content, created_at, organisation_id")
    .eq("id", scan_id)
    .single();

  if (!scan || scan.verdict !== "greenlit") notFound();

  const { data: org } = await service
    .from("organisations")
    .select("name")
    .eq("id", scan.organisation_id)
    .single();

  const contentHash = createHash("sha256").update(scan.raw_content ?? "").digest("hex");
  const date = new Date(scan.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });

  return (
    <div className="min-h-screen bg-[#F5F3EE] flex items-center justify-center p-6 print:bg-white">
      <div className="w-full max-w-xl bg-white border border-gray-200 rounded-2xl p-10 shadow-sm print:shadow-none print:border-gray-300">
        <div className="flex items-center justify-between mb-10">
          <span className="text-2xl font-bold tracking-tight text-[#1D9E75]">greenlit</span>
          <span className="text-[11px] uppercase tracking-widest text-gray-400">Content clearance certificate</span>
        </div>

        <div className="text-center py-6">
          <div className="mx-auto w-16 h-16 rounded-full bg-[#1D9E75]/10 flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-[#1D9E75]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-2xl font-semibold text-gray-900">Cleared to publish</h1>
          <p className="text-sm text-gray-500 mt-2">
            This {scan.content_type} passed Greenlit&apos;s compliance check for the {scan.jurisdiction === "IN" ? "Indian" : scan.jurisdiction} market.
          </p>
        </div>

        <dl className="mt-8 space-y-3 text-sm border-t border-gray-100 pt-6">
          <div className="flex justify-between gap-4">
            <dt className="text-gray-400">Checked for</dt>
            <dd className="text-gray-800 font-medium">{org?.name ?? "Greenlit workspace"}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-gray-400">Date</dt>
            <dd className="text-gray-800">{date}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-gray-400">Certificate ID</dt>
            <dd className="text-gray-800 font-mono text-xs">{scan.id}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-gray-400 shrink-0">Content fingerprint</dt>
            <dd className="text-gray-500 font-mono text-[10px] break-all text-right">{contentHash}</dd>
          </div>
        </dl>

        <p className="text-[11px] text-gray-400 mt-8 leading-relaxed">
          The fingerprint is a SHA-256 hash of the exact content that was checked — if the published
          content matches the hash, it is the content this certificate covers. AI-assisted review;
          not legal advice. Verify at getgreenlit.in/certificate/{scan.id.slice(0, 8)}…
        </p>
      </div>
    </div>
  );
}
