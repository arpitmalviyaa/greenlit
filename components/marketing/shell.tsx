import { MarketingNav } from "./nav";
import { MarketingFooter } from "./footer";
import { FinalBand } from "./sections";

export function MarketingShell({ children, closer = true }: { children: React.ReactNode; closer?: boolean }) {
  return (
    <div className="bg-[#F5F3EE] min-h-screen">
      <MarketingNav />
      <main>{children}</main>
      {closer && <FinalBand />}
      <MarketingFooter />
    </div>
  );
}
