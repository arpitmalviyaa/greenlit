"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils/cn";
import type { UserRole } from "@/types/database.types";
import {
  FileText,
  Shield,
  Users,
  BarChart3,
  AlertTriangle,
  CheckSquare,
  Package,
  Zap,
  MessageSquare,
  BookOpen,
  Settings,
  LogOut,
  Home,
  Eye,
  Scale,
  Clock,
  Send,
  Mic,
  Link2,
  Crosshair,
  Bot,
  Briefcase,
  Globe,
  CreditCard,
  FileCheck2,
} from "lucide-react";

type NavItem = {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
};

// Greenlit narrowed to 4 pillars (2026-06-19 decision). Orphaned features archived;
// nav below reflects only the live pillar surface.
const AGENCY_NAV: NavItem[] = [
  { label: "Dashboard", href: "/agency", icon: Home },
  // Contract Review
  { label: "Counsel", href: "/agency/counsel", icon: FileText },
  { label: "NDA Scanner", href: "/agency/nda-scanner", icon: Eye },
  { label: "Send Scanner", href: "/agency/send-scanner", icon: Send },
  // Negotiation Assistant
  { label: "Deal Rooms", href: "/agency/deals", icon: MessageSquare },
  { label: "Term Sheets", href: "/agency/term-sheets", icon: FileText },
  { label: "Scope Monitor", href: "/agency/scope", icon: Package },
  { label: "Meeting Counsel", href: "/agency/meeting", icon: Mic },
  // Final Contract Check
  { label: "Delivery", href: "/agency/delivery", icon: CheckSquare },
  { label: "Approvals", href: "/agency/approvals", icon: CheckSquare },
  { label: "Timeline", href: "/agency/timeline", icon: Clock },
  // Knowledge Repository
  { label: "Legal Playbook", href: "/agency/playbook", icon: BookOpen },
  { label: "Cross-Reference", href: "/agency/cross-reference", icon: Globe },
  { label: "Proof Vault", href: "/agency/approvals", icon: Shield },
];

const CREATOR_NAV: NavItem[] = [
  { label: "Contracts", href: "/creator?view=contracts", icon: FileText },
  { label: "Negotiation Assistant", href: "/creator?view=negotiation", icon: MessageSquare },
  { label: "Final Contract Upload", href: "/creator?view=final", icon: FileCheck2 },
  { label: "Knowledge", href: "/creator?view=knowledge", icon: BookOpen },
];

const MANAGER_NAV: NavItem[] = [
  { label: "Dashboard", href: "/manager", icon: Home },
  { label: "Campaigns", href: "/manager/campaigns", icon: BarChart3 },
  { label: "Contracts", href: "/manager/contracts", icon: FileText },
  { label: "Approvals", href: "/manager/approvals", icon: CheckSquare },
  { label: "Scope", href: "/manager/scope", icon: Package },
  { label: "Comms", href: "/manager/comms", icon: MessageSquare },
];

const BRAND_NAV: NavItem[] = [
  { label: "Dashboard", href: "/brand", icon: Home },
  { label: "Approvals", href: "/brand/approvals", icon: CheckSquare },
  { label: "Compliance Certs", href: "/brand/certs", icon: Shield },
  { label: "Evidence", href: "/brand/evidence", icon: Package },
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
}

export function Sidebar({ role, orgName, userName }: SidebarProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
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
          const Icon = item.icon;
          const [itemPath, itemQuery] = item.href.split("?");
          const expectedView = itemQuery ? new URLSearchParams(itemQuery).get("view") : null;
          const isActive = expectedView
            ? pathname === itemPath && (searchParams.get("view") ?? "contracts") === expectedView
            : pathname === item.href || pathname.startsWith(item.href + "/");
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
              {item.badge && (
                <span className="ml-auto bg-red-500 text-white text-xs rounded-full px-1.5 py-0.5 leading-none">
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* User footer */}
      <div className="px-3 py-4 border-t border-white/10 space-y-0.5">
        <div className="hidden px-3 py-2 md:block">
          <p className="text-zinc-300 text-sm font-medium truncate">{userName}</p>
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
