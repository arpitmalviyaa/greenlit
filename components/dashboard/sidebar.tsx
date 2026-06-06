"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
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
} from "lucide-react";

type NavItem = {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
};

const AGENCY_NAV: NavItem[] = [
  { label: "Dashboard", href: "/agency", icon: Home },
  { label: "Counsel", href: "/agency/counsel", icon: FileText },
  { label: "Content Shield", href: "/agency/content", icon: Shield },
  { label: "Claims", href: "/agency/claims", icon: Zap },
  { label: "SOW Builder", href: "/agency/sow", icon: FileText },
  { label: "Scope Monitor", href: "/agency/scope", icon: Package },
  { label: "Delivery", href: "/agency/delivery", icon: CheckSquare },
  { label: "Approvals", href: "/agency/approvals", icon: CheckSquare },
  { label: "Proof Vault", href: "/agency/approvals", icon: Shield },
  { label: "Timeline", href: "/agency/timeline", icon: Clock },
  { label: "Deal Rooms", href: "/agency/deals", icon: MessageSquare },
  { label: "Exclusivity", href: "/agency/exclusivity", icon: Eye },
  { label: "Whitelisting", href: "/agency/whitelisting", icon: Shield },
  { label: "Rights Pricing", href: "/agency/rights", icon: Scale },
  { label: "Creator Passport", href: "/agency/passport", icon: Users },
  { label: "Send Scanner", href: "/agency/send-scanner", icon: Send },
  { label: "Meeting Counsel", href: "/agency/meeting", icon: Mic },
  { label: "Term Sheets", href: "/agency/term-sheets", icon: FileText },
  { label: "Legal Notices", href: "/agency/notices", icon: AlertTriangle },
  { label: "Crisis Room", href: "/agency/crisis", icon: AlertTriangle },
  { label: "IP & Takedowns", href: "/agency/ip", icon: Shield },
  { label: "Legal Playbook", href: "/agency/playbook", icon: BookOpen },
  { label: "NDA Scanner", href: "/agency/nda-scanner", icon: Eye },
  { label: "AI & Vendor Risk", href: "/agency/ai-risk", icon: Bot },
  { label: "Cross-Reference", href: "/agency/cross-reference", icon: Globe },
  { label: "Adversary Lens", href: "/agency/adversary", icon: Crosshair },
];

const CREATOR_NAV: NavItem[] = [
  { label: "Dashboard", href: "/creator", icon: Home },
  { label: "My Contracts", href: "/creator/contracts", icon: FileText },
  { label: "Content Scanner", href: "/creator/content", icon: Shield },
  { label: "My Rights", href: "/creator/rights", icon: Scale },
  { label: "Exclusivity", href: "/creator/exclusivity", icon: Eye },
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
  const router = useRouter();
  const nav = NAV_BY_ROLE[role];

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <aside className="flex flex-col w-64 min-h-screen bg-slate-900 border-r border-slate-800">
      {/* Logo */}
      <div className="flex items-center gap-2 px-6 py-5 border-b border-slate-800">
        <div className="w-7 h-7 rounded-md bg-green-500 flex items-center justify-center flex-shrink-0">
          <span className="text-white font-bold text-xs">G</span>
        </div>
        <div className="min-w-0">
          <p className="text-white font-semibold text-sm leading-none truncate">{orgName}</p>
          <p className="text-slate-500 text-xs mt-0.5">{ROLE_LABELS[role]}</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {nav.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors",
                isActive
                  ? "bg-green-900/50 text-green-400 font-medium"
                  : "text-slate-400 hover:text-slate-100 hover:bg-slate-800"
              )}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              {item.label}
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
      <div className="px-3 py-4 border-t border-slate-800 space-y-0.5">
        <div className="px-3 py-2">
          <p className="text-slate-300 text-sm font-medium truncate">{userName}</p>
        </div>
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 px-3 py-2 rounded-md text-sm text-slate-400 hover:text-red-400 hover:bg-slate-800 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Sign out
        </button>
      </div>
    </aside>
  );
}
