"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils/cn";
import type { UserRole } from "@/types/database.types";
import {
  FileText,
  ShieldCheck,
  CheckSquare,
  Briefcase,
  Settings,
  LogOut,
  Home,
  History,
} from "lucide-react";

type NavItem = {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
};

// v1 surface: exactly six items (2026-07 restructure). Everything else is
// feature-flagged off — see FEATURE_FLAGS.md.
const AGENCY_NAV: NavItem[] = [
  { label: "Dashboard", href: "/agency", icon: Home },
  { label: "Contracts", href: "/agency/contracts", icon: FileText },
  { label: "Content Check", href: "/agency/content-check", icon: ShieldCheck },
  { label: "Approvals", href: "/agency/approvals", icon: CheckSquare },
  { label: "Deals", href: "/agency/deals", icon: Briefcase },
  { label: "Settings", href: "/agency/settings", icon: Settings },
];

const CREATOR_NAV: NavItem[] = [
  { label: "Check", href: "/creator", icon: ShieldCheck },
  { label: "My Deals", href: "/creator/deals", icon: Briefcase },
  { label: "History", href: "/creator/history", icon: History },
];

const MANAGER_NAV: NavItem[] = [
  { label: "Dashboard", href: "/manager", icon: Home },
  { label: "Contracts", href: "/agency/contracts", icon: FileText },
  { label: "Approvals", href: "/agency/approvals", icon: CheckSquare },
  { label: "Deals", href: "/agency/deals", icon: Briefcase },
];

const BRAND_NAV: NavItem[] = [
  { label: "Dashboard", href: "/brand", icon: Home },
  { label: "Approvals", href: "/brand/approvals", icon: CheckSquare },
];

const NAV_BY_ROLE: Record<UserRole, NavItem[]> = {
  agency_admin: AGENCY_NAV,
  creator: CREATOR_NAV,
  manager: MANAGER_NAV,
  brand: BRAND_NAV,
};

const ROLE_LABELS: Record<UserRole, string> = {
  agency_admin: "Agency Admin",
  creator: "Creator",
  manager: "Manager",
  brand: "Brand",
};

interface SidebarProps {
  role: UserRole;
  orgName: string;
  userName: string;
  planName?: string;
}

export function Sidebar({ role, orgName, userName, planName }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const nav = NAV_BY_ROLE[role];

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <aside className="flex min-h-screen w-16 flex-col border-r border-white/10 bg-black md:w-64">
      {/* Logo */}
      <div className="flex items-center justify-center gap-2 border-b border-white/10 px-3 py-5 md:justify-start md:px-6">
        <div className="w-7 h-7 rounded-md border border-white flex items-center justify-center flex-shrink-0">
          <span className="text-white font-bold text-xs">G</span>
        </div>
        <div className="hidden min-w-0 md:block">
          <p className="text-white font-semibold text-sm leading-none truncate">{orgName}</p>
          <p className="text-zinc-500 text-xs mt-0.5">{ROLE_LABELS[role]}</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {nav.map((item) => {
          const isActive =
            item.href === "/agency" || item.href === "/creator"
              ? pathname === item.href
              : pathname === item.href || pathname.startsWith(item.href + "/");
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors",
                isActive
                  ? "bg-white text-black font-medium"
                  : "text-zinc-400 hover:text-white hover:bg-white/10"
              )}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              <span className="hidden md:inline">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* User footer */}
      <div className="px-3 py-4 border-t border-white/10 space-y-0.5">
        <div className="hidden px-3 py-2 md:flex md:items-center md:justify-between md:gap-2">
          <p className="text-zinc-300 text-sm font-medium truncate">{userName}</p>
          {planName && (
            <Link
              href="/agency/settings"
              className="text-[10px] uppercase tracking-wide border border-white/20 rounded px-1.5 py-0.5 text-zinc-400 hover:text-white"
            >
              {planName}
            </Link>
          )}
        </div>
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 px-3 py-2 rounded-md text-sm text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          <span className="hidden md:inline">Sign out</span>
        </button>
      </div>
    </aside>
  );
}
