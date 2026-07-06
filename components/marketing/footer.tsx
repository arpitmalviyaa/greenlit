import Link from "next/link";

export function MarketingFooter() {
  return (
    <footer className="bg-[#111] text-[#F5F3EE]/60">
      <div className="max-w-6xl mx-auto px-5 py-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
        <div>
          <p className="text-[#1D9E75] font-bold text-lg font-[family-name:var(--font-display)]">greenlit</p>
          <p className="text-xs mt-1">Contract intelligence for the creator economy.</p>
        </div>
        <nav className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
          <Link href="/agencies" className="hover:text-[#F5F3EE] transition-colors">Agencies</Link>
          <Link href="/creators" className="hover:text-[#F5F3EE] transition-colors">Creators</Link>
          <Link href="/pricing" className="hover:text-[#F5F3EE] transition-colors">Pricing</Link>
          <Link href="/security" className="hover:text-[#F5F3EE] transition-colors">Security</Link>
          <a href="mailto:hello@getgreenlit.in" className="hover:text-[#F5F3EE] transition-colors">Contact</a>
        </nav>
      </div>
      <div className="max-w-6xl mx-auto px-5 pb-8">
        <p className="text-[11px] text-[#F5F3EE]/40">
          © {new Date().getFullYear()} Greenlit. AI-assisted review — not a law firm, and not a substitute for one when it matters.
        </p>
      </div>
    </footer>
  );
}
