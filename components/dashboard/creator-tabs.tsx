"use client";

// Creator mobile chrome: bottom tab bar (Check | My Deals | History) and a
// persistent "New check" FAB. Desktop uses the sidebar; this renders md:hidden.

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils/cn";
import { ShieldCheck, Briefcase, History, Plus } from "lucide-react";

const TABS = [
  { label: "Check", href: "/creator", icon: ShieldCheck },
  { label: "My Deals", href: "/creator/deals", icon: Briefcase },
  { label: "History", href: "/creator/history", icon: History },
];

export function CreatorTabs() {
  const pathname = usePathname();

  return (
    <>
      {pathname !== "/creator" && (
        <Link
          href="/creator"
          className="md:hidden fixed bottom-20 right-4 z-40 w-14 h-14 rounded-full bg-[#1D9E75] text-white shadow-lg flex items-center justify-center"
          aria-label="New check"
        >
          <Plus className="w-6 h-6" />
        </Link>
      )}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white border-t border-gray-200 flex">
        {TABS.map(({ label, href, icon: Icon }) => {
          const active = href === "/creator" ? pathname === href : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex-1 flex flex-col items-center gap-0.5 py-2.5 text-[11px] font-medium",
                active ? "text-[#1D9E75]" : "text-gray-400"
              )}
            >
              <Icon className="w-5 h-5" />
              {label}
            </Link>
          );
        })}
      </nav>
    </>
  );
}
