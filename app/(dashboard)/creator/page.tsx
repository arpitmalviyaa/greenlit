import { ContentCheckPanel } from "@/components/analysis/content-check-panel";

export default function CreatorCheckPage() {
  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto space-y-4">
      <div>
        <h1 className="text-lg font-semibold text-gray-900">Check</h1>
        <p className="text-sm text-gray-500 mt-0.5">Paste your content. Know before it goes live.</p>
      </div>
      <ContentCheckPanel compact />
    </div>
  );
}
