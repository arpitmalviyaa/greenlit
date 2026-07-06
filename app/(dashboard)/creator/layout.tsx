import { CreatorTabs } from "@/components/dashboard/creator-tabs";

export default function CreatorLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="pb-20 md:pb-0 min-h-screen bg-[#FAFAF8]">
      {children}
      <CreatorTabs />
    </div>
  );
}
