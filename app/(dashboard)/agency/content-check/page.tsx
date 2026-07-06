import { ContentCheckPanel } from "@/components/analysis/content-check-panel";

export default function ContentCheckPage() {
  return (
    <div className="p-6 max-w-6xl space-y-5">
      <div>
        <h1 className="text-lg font-semibold text-gray-900">Content Check</h1>
        <p className="text-sm text-gray-500 mt-1">
          Paste a script, caption or post. Get a clear verdict — and a shareable clearance
          certificate when it&apos;s good to go.
        </p>
      </div>
      <ContentCheckPanel />
    </div>
  );
}
